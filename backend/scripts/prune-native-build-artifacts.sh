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

# Object files and the vendored sources. `-prune` so find does not descend into what it just removed.
find node_modules -type d -name obj.target -prune -exec rm -rf {} + 2>/dev/null || true
rm -rf node_modules/re2/vendor

# Debug symbols. Applies to every addon, not just re2, so a future native dependency is covered too.
find node_modules -name '*.node' -exec strip --strip-unneeded {} + 2>/dev/null || true
