#!/bin/sh
# Remove what building a native addon leaves behind in node_modules.
#
# MUST run in the same RUN layer as the `yarn install` it cleans up after: a delete in a later layer
# only writes a whiteout on top and reclaims nothing.
#
# `re2` is the only native addon in backend/yarn.lock and it occupies 74 MB after a node-gyp build.
# The runtime needs two of those: re2.js (the package main) and build/Release/re2.node. Everything
# else is scaffolding — the bundled C++ sources it was compiled FROM (vendor/, 17 MB) and the object
# files it was compiled THROUGH (build/Release/obj.target/, 57 MB, which also hardlinks the addon
# itself). Stripping the debug symbols off the addon takes it from 22.8 MB down to 1.4 MB; the
# dynamic symbols Node needs to dlopen it (napi_register_module_v1 and friends) survive
# --strip-unneeded, which is why the addon still loads afterwards.
#
# Measured on the backend production image: node_modules 371 MB -> 300 MB.
#
# Usage: prune-native-build-artifacts [directory containing node_modules]
set -eu

cd "${1:-.}"

[ -d node_modules ] || exit 0

# Assert the toolchain up front. Without this a missing binutils would be indistinguishable from
# "nothing to strip": the script would report success having stripped nothing, which is the silent
# pass it exists to prevent. `strip` comes from binutils, which `base-build` gets via g++.
for tool in strip od du; do
  command -v "$tool" >/dev/null || {
    echo "prune-native: required tool '$tool' not found" >&2
    exit 1
  }
done

before=$(du -sk node_modules | cut -f1)

# Object files and the vendored sources. `-prune` so find does not descend into what it is removing.
# No error suppression anywhere below: `set -e` plus a missing `2>/dev/null` is what keeps a failure
# here — a read-only layer, a `strip` that is not installed — from silently shipping a fat image.
find node_modules -type d -name obj.target -prune -exec rm -rf {} +
rm -rf node_modules/re2/vendor

# Debug symbols. Applies to every addon, not just re2, so a future native dependency is covered too.
#
# Deliberately `-exec … +` and NOT `find … | while read`: a pipeline reports the status of its LAST
# command, so a failing `find` would pass unnoticed. POSIX requires find to exit non-zero when an
# `-exec … +` invocation does, which — combined with `set -e` here and `sh -e` in the child — makes
# every failure below fatal.
#
# The ELF magic decides, rather than asking a tool whether the file parses. Packages do ship .node
# files that are fixtures rather than addons, and skipping those is legitimate; a file that HAS the
# magic but cannot be stripped is a broken build artefact and must fail. A probe like `readelf -h`
# cannot tell those two apart — it exits non-zero for both, and inside an `if` condition `set -e`
# does not fire, so the broken case would silently take the "skip" path.
find node_modules -name '*.node' -type f -exec sh -ec '
  for addon do
    [ -r "$addon" ] || { echo "prune-native: cannot read $addon" >&2; exit 1; }
    if [ "$(od -An -tx1 -N4 "$addon" | tr -d " \n")" = "7f454c46" ]; then
      strip --strip-unneeded "$addon"
    else
      echo "prune-native: not an ELF object, left alone: $addon"
    fi
  done
' _ {} +

after=$(du -sk node_modules | cut -f1)
echo "prune-native: node_modules $((before / 1024)) MB -> $((after / 1024)) MB"
