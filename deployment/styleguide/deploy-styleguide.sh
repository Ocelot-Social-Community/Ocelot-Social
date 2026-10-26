#!/bin/sh
#
# Builds the styleguide and publishes it as $DEPLOY_DIR-<git sha>, then points
# the $DEPLOY_DIR symlink at it.
#
# Usage: deploy-styleguide.sh [DEPLOY_DIR]   (default: ./test)
#
# Environment:
#   KEEP_RELEASES  number of releases to keep, the live one included (default: 3)
#   FORCE          set to 1 to rebuild although styleguide/ did not change
#
# Guarantees:
#   - a failing step aborts the run and leaves the live release untouched
#   - a release only goes live once it is complete (contains index.html)
#   - runs never overlap; a trigger during a run causes exactly one follow-up run
#   - leftovers of an aborted run are removed by the next run
#
# Everything lives in functions and the script ends on a single line, so that
# `git pull` replacing this very file mid-run cannot change what sh executes.

set -eu

SCRIPT_DIR=$(dirname "$(realpath "$0")")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../..")
STYLEGUIDE_DIR=$PROJECT_ROOT/styleguide
BUILD_DIR=$STYLEGUIDE_DIR/docs
DEPLOY_DIR=${1:-test}
case $DEPLOY_DIR in
  /*) ;;
  *) DEPLOY_DIR=$PWD/$DEPLOY_DIR ;;
esac
LOCK_FILE=$DEPLOY_DIR.lock
PENDING_FILE=$DEPLOY_DIR.pending
KEEP_RELEASES=${KEEP_RELEASES:-3}
case $KEEP_RELEASES in
  '' | *[!0-9]*)
    echo "KEEP_RELEASES must be a non-negative integer, got '$KEEP_RELEASES'" >&2
    exit 1
    ;;
esac
FORCE=${FORCE:-0}
STAGING_DIR=

log() {
  echo "[deploy-styleguide $(date '+%Y-%m-%d %H:%M:%S')] $*"
}

on_exit() {
  status=$?
  if [ -n "$STAGING_DIR" ]; then
    rm -rf "$STAGING_DIR"
  fi
  if [ "$status" -ne 0 ]; then
    log "failed (exit $status), live release left untouched"
    # a trigger during this run may carry the fix, so it must not be dropped
    if [ -e "$PENDING_FILE" ]; then
      log "triggered again meanwhile, deploying once more"
      flock -u 9
      exec "$0" "$DEPLOY_DIR"
    fi
  fi
}

# Prints the git sha of a release directory name, or nothing if the name is
# not one of ours (guards the cleanup against deleting unrelated directories).
release_sha() {
  sha=${1#"$DEPLOY_DIR"-}
  sha=${sha%.tmp}
  case $sha in
    '' | *[!0-9a-f]*) ;;
    *) echo "$sha" ;;
  esac
}

current_release() {
  if [ -L "$DEPLOY_DIR" ]; then
    readlink "$DEPLOY_DIR"
  fi
}

# Swaps the symlink atomically, so there is no moment without a live release.
activate() {
  ln -sfn "$1" "$DEPLOY_DIR.new"
  mv -T "$DEPLOY_DIR.new" "$DEPLOY_DIR"
  log "live: $1"
}

styleguide_unchanged_since() {
  [ -n "$1" ] &&
    git -C "$PROJECT_ROOT" cat-file -e "$1^{commit}" 2>/dev/null &&
    git -C "$PROJECT_ROOT" diff --quiet "$1" HEAD -- styleguide
}

build() {
  log "building $1"
  rm -rf "$BUILD_DIR"
  (cd "$STYLEGUIDE_DIR" && npm ci && npm run build)
  if [ ! -f "$BUILD_DIR/index.html" ]; then
    log "build produced no index.html"
    return 1
  fi
}

deploy() {
  git -C "$PROJECT_ROOT" pull --ff-only
  sha=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)
  release=$DEPLOY_DIR-$sha
  live=$(current_release)

  if [ -f "$release/index.html" ]; then
    log "$sha is already built"
    [ "$live" = "$release" ] || activate "$release"
    return
  fi

  if [ "$FORCE" != 1 ] && [ -f "$live/index.html" ] &&
    styleguide_unchanged_since "$(release_sha "$live")"; then
    log "styleguide/ unchanged since $(release_sha "$live"), nothing to build"
    return
  fi

  # an empty or partial directory left behind by an aborted run
  rm -rf "$release"

  build "$sha"
  STAGING_DIR=$release.tmp
  rm -rf "$STAGING_DIR"
  cp -R "$BUILD_DIR" "$STAGING_DIR"
  mv "$STAGING_DIR" "$release"
  STAGING_DIR=
  activate "$release"
}

prune() {
  live=$(current_release)
  kept=0
  # newest first; release_sha below skips any name that is not <dir>-<sha>[.tmp]
  ls -1dt "$DEPLOY_DIR"-* 2>/dev/null | while read -r dir; do
    [ -n "$(release_sha "$dir")" ] || continue
    if [ "$dir" = "$live" ]; then
      continue
    fi
    case $dir in
      *.tmp) ;;
      *)
        kept=$((kept + 1))
        # the live release counts towards KEEP_RELEASES
        [ "$kept" -ge "$KEEP_RELEASES" ] || continue
        ;;
    esac
    log "removing old release $dir"
    rm -rf "$dir"
  done
}

main() {
  if [ -d "$DEPLOY_DIR" ] && [ ! -L "$DEPLOY_DIR" ]; then
    log "$DEPLOY_DIR is a real directory, remove it so it can become a symlink"
    exit 1
  fi

  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    touch "$PENDING_FILE"
    log "a deploy is already running, it will run once more afterwards"
    exit 0
  fi
  trap on_exit EXIT

  while :; do
    rm -f "$PENDING_FILE"
    deploy
    prune
    [ -e "$PENDING_FILE" ] || break
    log "triggered again meanwhile, deploying once more"
  done

  # A trigger arriving between the last check and here would be lost; pick it up.
  flock -u 9
  if [ -e "$PENDING_FILE" ]; then
    exec "$0" "$DEPLOY_DIR"
  fi
}

main "$@"; exit
