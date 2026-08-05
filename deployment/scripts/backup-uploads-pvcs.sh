#!/usr/bin/env bash
#
# Pulls the contents of every legacy `*-uploads` PVC in the cluster to the local disk.
#
# Background: uploads have lived in S3 since migration 20250502230521-migrate-to-s3, so these volumes
# are leftovers. Before the backend chart drops the PVC (see docu/backend-zero-downtime-konzept.md)
# we want one verifiable copy of whatever is still on them.
#
# The script is READ-ONLY against the cluster: it never deletes a PVC, a PV or any file, and it never
# writes inside the pod. Deleting is a separate, deliberate step — see the end of this file.
#
# Data is streamed out of the container that already mounts the volume (`tar` over `kubectl exec`),
# so no extra volume attachment is needed. RWO volumes cannot be mounted twice, which is exactly why
# a helper pod is NOT the default.
#
# ---------------------------------------------------------------------------------------------
# Why this transfers in chunks
#
# A single `kubectl exec | tar` stream dies after roughly 60 seconds of wall clock against at least
# one of our API servers, regardless of how much data is still in flight. The multiplexed SPDY
# connection carries stdin/stdout/stderr over ONE TCP connection, so a read deadline on it kills the
# transfer wholesale — the observed error is an i/o timeout on the *stderr* stream while stdout was
# happily streaming. Volumes below ~100 MB finish inside that window and look perfectly healthy;
# the first volume that does not (yunite-me-production, ~977 MiB at ~1.8 MB/s ≈ 9 min) can never
# succeed, and retrying a whole-volume stream just walks into the same wall from the start again.
#
# So the unit of transfer is a batch of files sized to finish in well under the timeout, not the
# volume. Each batch is streamed, verified and kept on its own; a run that dies at 80% resumes at
# 80%. Only after every batch is verified are they merged into one archive locally, so the on-disk
# result is identical in shape to a single-shot backup.
#
# Two consequences of merging locally, both harmless for uploads but worth knowing: directory mtimes
# and modes are recreated rather than transferred (file metadata is preserved, tar carries it), and
# only regular files travel — symlinks and device nodes are counted and reported, never archived.
# ---------------------------------------------------------------------------------------------

set -euo pipefail

OUT_DIR="./uploads-backup"
SUFFIX="-uploads"
NAMESPACE=""
DRY_RUN=false
FORCE=false
# 32 MiB is ~18 s at the slowest throughput we have measured (1.8 MB/s) — a third of the budget
# before the connection is torn down. Lower it if a cluster is slower still.
CHUNK_KIB=32768
CHUNK_FILES=200
ATTEMPTS=5
# Per-attempt wall clock. Generous compared to the expected ~20 s so that a slow-but-alive transfer
# is not killed, but low enough that a wedged stream does not stall the run for good.
ATTEMPT_TIMEOUT=180
WEBSOCKETS=false
KEEP_STAGING=false

usage() {
  cat <<'USAGE'
Usage: backup-uploads-pvcs.sh [options]

  -o, --output-dir DIR     where to write archives (default: ./uploads-backup)
  -n, --namespace NS       restrict to a single namespace (default: all)
  -s, --suffix SUFFIX      PVC name suffix to match (default: -uploads)
      --chunk-kib N        target payload per transfer, in KiB (default: 32768)
      --chunk-files N      hard cap on files per transfer (default: 200)
      --attempts N         retries per chunk (default: 5)
      --attempt-timeout S  seconds before a single chunk transfer is killed (default: 180)
      --websockets         use the WebSocket exec transport instead of SPDY
      --keep-staging       keep per-chunk archives and the extracted tree after success
      --dry-run            list what would be backed up, transfer nothing
      --force              re-transfer from scratch, overwriting existing archives
  -h, --help               this text

Resuming: an interrupted run is resumed simply by running the same command again. Verified chunks
are kept under <output-dir>/.staging and are not fetched twice, as long as the file listing on the
volume still matches. Use --force to discard that state.

Requires: kubectl (with a working context), jq, tar, gzip, sha256sum, timeout, awk, diff.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    -o|--output-dir)     OUT_DIR="$2"; shift 2 ;;
    -n|--namespace)      NAMESPACE="$2"; shift 2 ;;
    -s|--suffix)         SUFFIX="$2"; shift 2 ;;
    --chunk-kib)         CHUNK_KIB="$2"; shift 2 ;;
    --chunk-files)       CHUNK_FILES="$2"; shift 2 ;;
    --attempts)          ATTEMPTS="$2"; shift 2 ;;
    --attempt-timeout)   ATTEMPT_TIMEOUT="$2"; shift 2 ;;
    --websockets)        WEBSOCKETS=true; shift ;;
    --keep-staging)      KEEP_STAGING=true; shift ;;
    --dry-run)           DRY_RUN=true; shift ;;
    --force)             FORCE=true; shift ;;
    -h|--help)           usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

for tool in kubectl jq tar gzip sha256sum timeout awk diff; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

# Left to kubectl by default, and deliberately so: modern kubectl prefers WebSockets where the API
# server supports it, which is the transport we want. SPDY multiplexes stdout and stderr onto one
# connection, which is precisely the failure described at the top of this file — exporting `false`
# unconditionally would pin every run to it. Only pin when the caller explicitly asks.
if [ "$WEBSOCKETS" = true ]; then
  export KUBECTL_REMOTE_COMMAND_WEBSOCKETS=true
fi

CONTEXT=$(kubectl config current-context)
echo "cluster context : $CONTEXT"
echo "output directory: $OUT_DIR"
echo "matching PVCs   : *$SUFFIX${NAMESPACE:+ in namespace $NAMESPACE}"
echo "chunking        : ${CHUNK_KIB} KiB / ${CHUNK_FILES} files per transfer, ${ATTEMPTS} attempts"
echo

# ------------------------------------------------------------------------------------ pod helpers
#
# Two shapes of remote call, and the difference matters.
#
# `pod_sh` runs a small shell snippet and captures its text output — listings, counters. Cheap and
# short-lived, so the 60 s ceiling is irrelevant here.
#
# `pod_tar` streams binary. The file names are passed as POSITIONAL PARAMETERS to `sh`, never
# interpolated into the snippet, so no amount of quoting weirdness in a filename can turn into shell
# syntax. The trailing `sleep` is not cosmetic: when tar exits, kubectl can tear the connection down
# before the last buffered blocks have crossed it, which produces an archive that ends just short of
# its end-of-archive marker. Keeping the remote command alive briefly lets the stream drain.
#
# stdin is redirected from /dev/null throughout. Without it kubectl either hangs on "waiting for
# server to close stdin", or — worse — the loop below silently eats the PVC list on stdin.
pod_sh() {
  local ns=$1 pod=$2 container=$3 snippet=$4
  kubectl -n "$ns" exec "$pod" -c "$container" --request-timeout=0 -- sh -c "$snippet" </dev/null
}

pod_tar() {
  local ns=$1 pod=$2 container=$3 mount=$4; shift 4
  timeout "$ATTEMPT_TIMEOUT" \
    kubectl -n "$ns" exec "$pod" -c "$container" --request-timeout=0 \
      -- sh -c 'dir=$1; shift; tar -C "$dir" -cf - -- "$@"; sleep 2' sh "$mount" "$@" </dev/null
}

# A chunk counts as good only if it lists exactly the paths the plan assigned to it. A truncated
# stream can still decompress and can still contain plausible files, so `gzip -t` alone would happily
# wave through a chunk that lost its tail — which is precisely the failure mode we are working
# around. Comparing the full sorted path set costs nothing and leaves no room for that.
chunk_ok() {
  local chunk=$1 expected=$2
  gzip -t "$chunk" 2>/dev/null || return 1
  tar -tzf "$chunk" 2>/dev/null | grep -v '/$' | LC_ALL=C sort | diff -q - "$expected" >/dev/null 2>&1
}

# A volume of a few hundred chunks would scroll a terminal for no good reason, so progress
# overwrites a single line there. Redirected into a log file that same trick produces one endless
# unreadable line, so fall back to one line per state change.
progress() {
  if [ -t 1 ]; then
    printf '\r   %-58s' "$1"
  else
    printf '   %s\n' "$1"
  fi
}

progress_clear() {
  [ -t 1 ] && printf '\r%*s\r' 62 '' || true
}

# ---------------------------------------------------------------- discover PVCs
if [ -n "$NAMESPACE" ]; then
  pvc_json=$(kubectl -n "$NAMESPACE" get pvc -o json)
else
  pvc_json=$(kubectl get pvc --all-namespaces -o json)
fi

pvcs=$(printf '%s' "$pvc_json" | jq -r --arg suffix "$SUFFIX" '
  .items[]
  | select(.metadata.name | endswith($suffix))
  | [.metadata.namespace, .metadata.name, (.spec.volumeName // "-"), .status.phase]
  | @tsv')

if [ -z "$pvcs" ]; then
  echo "no PVC matching *$SUFFIX found — nothing to do."
  exit 0
fi

mkdir -p "$OUT_DIR"
MANIFEST="$OUT_DIR/manifest.tsv"
if [ ! -f "$MANIFEST" ]; then
  printf 'timestamp\tnamespace\tpvc\tpv\tpod\tmount\tfiles\tsize_kib\tsha256\tarchive\n' > "$MANIFEST"
fi

total=0; copied=0; empty=0; skipped=0; failed=0

while IFS=$'\t' read -r ns pvc pv phase; do
  [ -n "$ns" ] || continue
  total=$((total + 1))
  echo "── $ns/$pvc  (pv: $pv, phase: $phase)"

  if [ "$phase" != "Bound" ]; then
    echo "   SKIP: phase is $phase, not Bound"
    skipped=$((skipped + 1))
    continue
  fi

  # Find a running pod that mounts this claim, plus the container and its mount path. A pod can
  # reference the claim under an arbitrary volume name, so resolve volume -> mount instead of
  # assuming /app/public/uploads.
  target=$(kubectl -n "$ns" get pods -o json | jq -r --arg pvc "$pvc" '
    .items[]
    | select(.status.phase == "Running")
    | . as $pod
    | ($pod.spec.volumes[]? | select(.persistentVolumeClaim.claimName == $pvc) | .name) as $vol
    | $pod.spec.containers[]
    | . as $container
    | ($container.volumeMounts[]? | select(.name == $vol) | .mountPath) as $mount
    | [$pod.metadata.name, $container.name, $mount]
    | @tsv' | head -n 1)

  if [ -z "$target" ]; then
    echo "   SKIP: no running pod mounts this claim."
    echo "         (RWO volumes cannot be attached twice — if the workload was already migrated,"
    echo "          scale it back up briefly or mount the PV manually to reach the data.)"
    skipped=$((skipped + 1))
    continue
  fi

  IFS=$'\t' read -r pod container mount <<< "$target"
  echo "   source: pod/$pod [$container] : $mount"

  archive="$OUT_DIR/${ns}__${pvc}.tar.gz"

  if [ -f "$archive" ] && [ "$FORCE" != true ]; then
    echo "   SKIP: $archive exists (use --force to overwrite)"
    skipped=$((skipped + 1))
    continue
  fi

  # One round trip for all the counters. Counting the NUL separators of `-print0` is the only file
  # count that is immune to newlines in filenames — translating NUL to newline is not, because the
  # embedded newline survives the translation and inflates the count exactly like the plain listing
  # does. The plain line count is here purely as the comparison partner: if the two disagree, some
  # filename contains a newline and every listing this script parses would be silently wrong.
  # `! -type f ! -type d` catches symlinks, sockets and devices, which the transfer below ignores —
  # better to say so than to hand over an archive that quietly dropped them.
  counters=$(pod_sh "$ns" "$pod" "$container" "cd '$mount' 2>/dev/null || exit 1
    find . -type f -print0 | tr -dc '\0' | wc -c
    find . -type f | wc -l
    find . ! -type f ! -type d | wc -l
    du -sk . | cut -f1")
  { read -r files; read -r files_lines; read -r others; read -r size_kib; } <<< "$(tr -d '[:blank:]' <<< "$counters")"

  echo "   content: $files files, ${size_kib} KiB"

  if [ "$files" != "$files_lines" ]; then
    echo "   FAILED: filenames containing newlines are present ($files_lines listed lines for"
    echo "           $files files). Chunked transfer cannot address those safely — pull this"
    echo "           volume with a single-shot tar, or rename the offenders first."
    failed=$((failed + 1))
    continue
  fi

  if [ "$others" != "0" ]; then
    echo "   WARNING: $others entries are neither regular files nor directories (symlinks, devices)"
    echo "            and will NOT be part of the archive."
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "   DRY-RUN: would write $archive"
    continue
  fi

  # Chunks, the extracted tree and the final archive coexist for a moment, so budget roughly 2.5x
  # the volume. Running out of space cannot corrupt a backup — every stage is verified — but it
  # wastes a long transfer, so say it up front.
  avail_kib=$(df -Pk "$OUT_DIR" | awk 'NR == 2 { print $4 }')
  if [ "$((size_kib * 5 / 2))" -gt "$avail_kib" ]; then
    echo "   WARNING: ~$((size_kib * 5 / 2 / 1024)) MiB needed during assembly, $((avail_kib / 1024)) MiB free on $OUT_DIR"
  fi

  stage="$OUT_DIR/.staging/${ns}__${pvc}"
  [ "$FORCE" = true ] && rm -rf "$stage"
  mkdir -p "$stage/chunks"

  # Directory entries travel separately: tar only ever gets regular files (passing a directory
  # would make it recurse and duplicate payload across chunks), so directories that hold no files
  # would otherwise vanish from the archive.
  pod_sh "$ns" "$pod" "$container" "cd '$mount' && find . -type d" > "$stage/dirs.txt"

  # Size-annotated listing, one `<kib>\t<path>` per line. `du -k` reports allocated blocks, so the
  # sum overshoots for many small files — that errs towards smaller chunks, which is the safe side.
  #
  # `-l` is load-bearing, not a tuning knob: without it du counts each inode ONCE, so the second and
  # every further hard link to a file is omitted from the listing entirely. Those paths would never
  # reach the plan, never be transferred, and the run would die at the merge check ("holds N of M
  # files") with nothing pointing at the cause. Counting the payload repeatedly is the harmless
  # direction — it only makes chunks smaller. Verified on both GNU coreutils and BusyBox.
  listing="$stage/listing.tsv"
  if [ "$files" != "0" ]; then
    pod_sh "$ns" "$pod" "$container" "cd '$mount' && find . -type f -exec du -kl {} +" > "$listing"
  else
    : > "$listing"
  fi

  # A cached chunk is only reusable while a fresh plan would assign it the same contents, because
  # chunk N is defined by the plan and not by its own name. That depends on the volume (any added,
  # removed or grown file) AND on the chunk boundaries — so both go into the stamp. Hashing only the
  # listing would make the advice printed on failure a trap: re-running with a smaller --chunk-kib
  # would keep the old, too-large chunks and walk into exactly the same timeout.
  listing_sum=$(sha256sum "$listing" | cut -d' ' -f1)
  plan_stamp="$listing_sum $CHUNK_KIB $CHUNK_FILES"
  stamp_file="$stage/plan.stamp"
  plan="$stage/plan.tsv"
  if [ ! -f "$stamp_file" ] || [ "$(cat "$stamp_file")" != "$plan_stamp" ]; then
    if [ -f "$plan" ]; then
      if [ -f "$stamp_file" ] && [ "$(cut -d' ' -f1 "$stamp_file")" = "$listing_sum" ]; then
        echo "   chunk sizing changed since the last run — discarding cached chunks"
      else
        echo "   volume changed since the last run — discarding cached chunks"
      fi
    fi
    rm -rf "$stage/chunks" "$plan" "$stage/listing.sha256"
    mkdir -p "$stage/chunks"
    printf '%s' "$plan_stamp" > "$stamp_file"
  fi

  # Everything after the FIRST tab is the path, so paths containing tabs survive the round trip.
  if [ ! -f "$plan" ]; then
    awk -v max_kib="$CHUNK_KIB" -v max_files="$CHUNK_FILES" '
      BEGIN { idx = 0; acc = 0; n = 0 }
      {
        cut = index($0, "\t")
        size = substr($0, 1, cut - 1) + 0
        path = substr($0, cut + 1)
        if (n > 0 && (acc + size > max_kib || n >= max_files)) { idx++; acc = 0; n = 0 }
        acc += size; n++
        printf "%d\t%s\n", idx, path
      }' "$listing" > "$plan"
  fi

  chunks=0
  [ -s "$plan" ] && chunks=$(( $(cut -f1 "$plan" | tail -n 1) + 1 ))

  if [ "$chunks" -gt 0 ]; then
    echo "   transfer: $chunks chunks"
  fi

  # ------------------------------------------------------------------- fetch chunks
  chunk_failed=false
  ci=0
  while [ "$ci" -lt "$chunks" ]; do
    chunk=$(printf '%s/chunks/chunk-%04d.tar.gz' "$stage" "$ci")
    expected="$chunk.expected"

    mapfile -t batch < <(awk -v c="$ci" '
      { cut = index($0, "\t"); if (substr($0, 1, cut - 1) + 0 == c) print substr($0, cut + 1) }' "$plan")
    printf '%s\n' "${batch[@]}" | LC_ALL=C sort > "$expected"

    # A chunk on disk is only trusted after it has proven it holds exactly the paths the plan
    # assigned to it — not merely that it is a readable gzip.
    if [ -f "$chunk" ] && chunk_ok "$chunk" "$expected"; then
      progress "chunk $((ci + 1))/$chunks: cached"
      ci=$((ci + 1))
      continue
    fi

    attempt=1
    ok=false
    while [ "$attempt" -le "$ATTEMPTS" ]; do
      progress "chunk $((ci + 1))/$chunks: attempt $attempt/$ATTEMPTS (${#batch[@]} files)"
      if pod_tar "$ns" "$pod" "$container" "$mount" "${batch[@]}" 2>"$chunk.err" | gzip > "$chunk.part"; then
        if mv "$chunk.part" "$chunk" && chunk_ok "$chunk" "$expected"; then
          ok=true
          rm -f "$chunk.err"
          break
        fi
      fi
      rm -f "$chunk.part" "$chunk"
      attempt=$((attempt + 1))
      # Back off a little: a connection that was just reset rarely does better if hit immediately.
      [ "$attempt" -le "$ATTEMPTS" ] && sleep $((attempt * 3))
    done

    if [ "$ok" != true ]; then
      progress_clear
      echo "   chunk $((ci + 1))/$chunks FAILED after $ATTEMPTS attempts"
      [ -s "$chunk.err" ] && sed 's/^/     /' "$chunk.err" | tail -3
      echo "     files in this chunk: ${batch[0]} ... (${#batch[@]} entries, see $expected)"
      chunk_failed=true
      break
    fi
    ci=$((ci + 1))
  done
  progress_clear

  if [ "$chunk_failed" = true ]; then
    echo "   FAILED: incomplete transfer — $ci of $chunks chunks are on disk."
    echo "           Re-run to resume; they will not be fetched again. If it keeps failing on the"
    echo "           same chunk, retry with a smaller --chunk-kib or --websockets."
    failed=$((failed + 1))
    continue
  fi

  # ------------------------------------------------------------------- assemble locally
  tree="$stage/tree"
  rm -rf "$tree"
  mkdir -p "$tree"
  while IFS= read -r d; do
    [ -n "$d" ] && mkdir -p "$tree/$d"
  done < "$stage/dirs.txt"

  ci=0
  while [ "$ci" -lt "$chunks" ]; do
    tar -xzf "$(printf '%s/chunks/chunk-%04d.tar.gz' "$stage" "$ci")" -C "$tree"
    ci=$((ci + 1))
  done

  # The whole point of the exercise: the merged tree must hold every file the volume reported.
  # Anything else and nothing gets promoted to the final filename.
  merged=$(find "$tree" -type f -print0 | tr -dc '\0' | wc -c | tr -d '[:blank:]')
  if [ "$merged" != "$files" ]; then
    echo "   FAILED: merged tree holds $merged of $files files — refusing to write $archive"
    echo "           staging kept for inspection: $stage"
    failed=$((failed + 1))
    continue
  fi

  # `-n` keeps the run's timestamp out of the gzip header. That alone does not make the archive
  # bit-reproducible — the directory entries are recreated locally during assembly and carry
  # today's mtime — so do not read the manifest sha256 as a content fingerprint across runs. It
  # identifies this archive, which is all step 1 of the checklist below needs.
  tmp="$archive.part"
  tar -C "$tree" -cf - . | gzip -n > "$tmp"
  in_archive=$(tar -tzf "$tmp" 2>/dev/null | grep -cv '/$' || true)
  if ! gzip -t "$tmp" 2>/dev/null || [ "$in_archive" != "$files" ]; then
    echo "   FAILED: final archive holds $in_archive of $files files"
    rm -f "$tmp"
    failed=$((failed + 1))
    continue
  fi

  mv "$tmp" "$archive"
  [ "$KEEP_STAGING" = true ] || rm -rf "$stage"

  sha=$(sha256sum "$archive" | cut -d' ' -f1)
  # Append-only: a re-run with --force adds a new row rather than replacing the old one, so the
  # manifest doubles as a log of when a volume held what.
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$ns" "$pvc" "$pv" "$pod" "$mount" "$files" "$size_kib" "$sha" "$archive" >> "$MANIFEST"

  if [ "$files" = "0" ]; then
    echo "   EMPTY: volume holds no files — safe to drop"
    empty=$((empty + 1))
  else
    echo "   OK: $archive ($(du -h "$archive" | cut -f1))"
  fi
  copied=$((copied + 1))
done <<< "$pvcs"

echo
echo "──────────────────────────────────────────────"
echo "PVCs found     : $total"
echo "archived       : $copied  (of which empty: $empty)"
echo "skipped        : $skipped"
echo "failed         : $failed"
[ "$DRY_RUN" = true ] || echo "manifest       : $MANIFEST"
echo

if [ "$failed" -gt 0 ]; then
  exit 1
fi

cat <<'NEXT'
Next steps (deliberately NOT automated — all of them destroy data):

  1. Spot-check an archive before trusting it:
       tar -tzf uploads-backup/<ns>__<pvc>.tar.gz | head
  2. Make sure nothing still references the old paths, per instance:
       MATCH (i:Image)      WHERE i.url STARTS WITH '/uploads' RETURN count(i);
       MATCH (a:Attachment) WHERE a.url STARTS WITH '/uploads' RETURN count(a);
  3. Protect the volume before the chart drops the PVC (hcloud-volumes defaults to Delete):
       kubectl patch pv <pv> -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
  4. Only then roll out the chart without the PVC.
NEXT
