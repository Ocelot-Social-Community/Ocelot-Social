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

# Assert the toolchain up front. Without this, a missing binutils would make the `readelf` probe below
# fail for EVERY addon, each one would be classified as "not an ELF object" and skipped, and the
# script would report success having stripped nothing — the exact silent pass this script must not
# have. Both binaries come from binutils, which `base-build` gets via g++.
for tool in strip readelf du; do
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
# A `.node` that is not an ELF object is the ONE expected failure — packages do ship such files as
# fixtures, and `strip` rejects them. That case is detected and skipped explicitly; everything else
# still fails the build. `readelf` ships in the same binutils package as `strip`, so testing with it
# costs no extra dependency.
find node_modules -name '*.node' -type f | while IFS= read -r addon; do
  if readelf -h "$addon" >/dev/null 2>&1; then
    strip --strip-unneeded "$addon"
  else
    echo "prune-native: not an ELF object, left alone: $addon"
  fi
done

after=$(du -sk node_modules | cut -f1)
echo "prune-native: node_modules $((before / 1024)) MB -> $((after / 1024)) MB"
