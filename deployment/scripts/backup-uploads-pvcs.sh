#!/usr/bin/env bash
#
# Pulls the contents of every legacy `*-uploads` PVC in the cluster to the local disk.
#
# Background: uploads have lived in S3 since migration 20250502230521-migrate-to-s3, so these volumes
# are leftovers. Before the backend chart drops the PVC (see docu/backend-zero-downtime-konzept.md)
# we want one verifiable copy of whatever is still on them.
#
# The script is READ-ONLY against the cluster: it never deletes a PVC, a PV or any file. Deleting is
# a separate, deliberate step — see the end of this file.
#
# Data is streamed out of the container that already mounts the volume (`tar` over `kubectl exec`),
# so nothing is written inside the pod and no extra volume attachment is needed. RWO volumes cannot
# be mounted twice, which is exactly why a helper pod is NOT the default.

set -euo pipefail

OUT_DIR="./uploads-backup"
SUFFIX="-uploads"
NAMESPACE=""
DRY_RUN=false
FORCE=false

usage() {
  cat <<'USAGE'
Usage: backup-uploads-pvcs.sh [options]

  -o, --output-dir DIR   where to write archives (default: ./uploads-backup)
  -n, --namespace NS     restrict to a single namespace (default: all)
  -s, --suffix SUFFIX    PVC name suffix to match (default: -uploads)
      --dry-run          list what would be backed up, transfer nothing
      --force            overwrite archives that already exist
  -h, --help             this text

Requires: kubectl (with a working context), jq, tar, gzip, sha256sum.
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    -o|--output-dir) OUT_DIR="$2"; shift 2 ;;
    -n|--namespace)  NAMESPACE="$2"; shift 2 ;;
    -s|--suffix)     SUFFIX="$2"; shift 2 ;;
    --dry-run)       DRY_RUN=true; shift ;;
    --force)         FORCE=true; shift ;;
    -h|--help)       usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

for tool in kubectl jq tar gzip sha256sum; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

CONTEXT=$(kubectl config current-context)
echo "cluster context : $CONTEXT"
echo "output directory: $OUT_DIR"
echo "matching PVCs   : *$SUFFIX${NAMESPACE:+ in namespace $NAMESPACE}"
echo

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

  files=$(kubectl -n "$ns" exec "$pod" -c "$container" -- sh -c "find '$mount' -type f 2>/dev/null | wc -l" | tr -d '[:space:]')
  size_kib=$(kubectl -n "$ns" exec "$pod" -c "$container" -- sh -c "du -sk '$mount' 2>/dev/null | cut -f1" | tr -d '[:space:]')
  echo "   content: $files files, ${size_kib} KiB"

  archive="$OUT_DIR/${ns}__${pvc}.tar.gz"

  if [ "$DRY_RUN" = true ]; then
    echo "   DRY-RUN: would write $archive"
    continue
  fi

  if [ -f "$archive" ] && [ "$FORCE" != true ]; then
    echo "   SKIP: $archive exists (use --force to overwrite)"
    skipped=$((skipped + 1))
    continue
  fi

  # Plain tar in the pod, gzip locally: busybox tar's -z is not guaranteed, local gzip is.
  #
  # `exec -i < /dev/null` is deliberate and both halves matter. Without -i kubectl can exit 0 while
  # the stdout stream was silently truncated — corrupt archives that look successful. With -i but
  # an inherited terminal on stdin, kubectl instead hangs on "waiting for server to close stdin",
  # because tar never reads it. Redirecting from /dev/null gives a stdin that closes immediately.
  # No -t under any circumstances, otherwise the stream is not binary safe.
  #
  # Every attempt is verified end to end and NOTHING is promoted to the final filename unless it
  # passes. A partial transfer is retried, because on volumes of a few hundred MB a truncated
  # stream is a transport hiccup, not a permanent condition.
  tmp="$archive.part"
  errlog="$archive.err"
  attempts=3
  attempt=1
  verified=false

  while [ "$attempt" -le "$attempts" ]; do
    # The trailing `sleep` is not cosmetic. Observed failures always lost the LAST few files
    # (108/111, 206/212, 1319/1326): when tar exits, kubectl tears the connection down before the
    # final buffered blocks have crossed it, so the archive ends just short of its end-of-archive
    # marker. Keeping the remote command alive for a moment lets the stream drain.
    if kubectl -n "$ns" exec -i "$pod" -c "$container" \
         -- sh -c "tar -C '$mount' -cf - . ; sleep 5" </dev/null 2>"$errlog" | gzip > "$tmp"; then
      if ! gzip -t "$tmp" 2>/dev/null; then
        echo "   attempt $attempt/$attempts: gzip stream is truncated"
      else
        # Directory entries end in '/', everything else counts as a file. `|| true` keeps the
        # partial count when tar aborts, instead of masking it as 0.
        in_archive=$(tar -tzf "$tmp" 2>/dev/null | grep -cv '/$' || true)
        if [ "$in_archive" = "$files" ]; then
          verified=true
          break
        fi
        echo "   attempt $attempt/$attempts: archive holds $in_archive of $files files"
      fi
    else
      echo "   attempt $attempt/$attempts: transfer error"
      [ -s "$errlog" ] && sed 's/^/     /' "$errlog" | tail -3
    fi
    attempt=$((attempt + 1))
    # Streaming a few hundred MB through the API server is what fails here, and it fails
    # intermittently. A short pause costs nothing and avoids hammering a server that just reset us.
    [ "$attempt" -le "$attempts" ] && sleep 5
  done

  if [ "$verified" != true ]; then
    echo "   FAILED: no complete archive after $attempts attempts"
    echo "           partial file kept for inspection: $tmp"
    failed=$((failed + 1))
    continue
  fi
  rm -f "$errlog"

  mv "$tmp" "$archive"
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
