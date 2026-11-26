#!/bin/sh
# Run by the `packages` service of docker-compose.override.yml before the development containers start.
#
# Those containers mount ./packages/* from the host, which hides the `dist/` their images were built
# with, and `dist/` is not committed. So on a fresh checkout it has to be built into the mounted
# folders. A `dist/` that is already there is left alone.
set -eu

cd "$(dirname "$0")"

# build <package> <file that only a complete build contains>
build() {
  if [ -f "$1/$2" ]; then
    echo "packages/$1: dist/ found, nothing to do"
    return
  fi

  echo "packages/$1: building dist/"
  # Built in a copy: installing in the mounted folder would put Linux binaries into the host's
  # node_modules.
  work="$(mktemp -d)"
  tar -C "$1" --exclude=./node_modules --exclude=./dist -cf - . | tar -C "$work" -xf -
  (cd "$work" && npm ci --no-audit --no-fund && npm run build)
  rm -rf "$1/dist"
  cp -R "$work/dist" "$1/dist"
  # This container runs as root: on a Linux host the folder would otherwise not be the developer's.
  chown -R "$(stat -c '%u:%g' "$1")" "$1/dist"
  rm -rf "$work"
}

build branding dist/package.json
build ui dist/style.css
