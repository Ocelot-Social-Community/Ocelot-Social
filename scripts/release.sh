#!/bin/sh
set -eu

# base setup
SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(dirname "$SCRIPT_PATH")
ROOT_DIR="$SCRIPT_DIR/.."

# Update Version
# `yarn version` prompted for the new version when given no --new-version; `npm version` has no
# interactive mode, so the prompt is spelled out here to keep the same usage.
cd "$ROOT_DIR"
VERSION_CURRENT=$(node -p -e "require('$ROOT_DIR/package.json').version")
printf 'Current version: %s\nNew version: ' "$VERSION_CURRENT"
read -r VERSION_NEW
npm version --no-git-tag-version --allow-same-version "$VERSION_NEW"

## packages
cd "$ROOT_DIR/backend"
npm version --no-git-tag-version --allow-same-version "$VERSION_NEW"
cd "$ROOT_DIR/webapp"
npm version --no-git-tag-version --allow-same-version "$VERSION_NEW"
cd "$ROOT_DIR/maintenance"
npm version --no-git-tag-version --allow-same-version "$VERSION_NEW"

## helm
sed -i -e 's/appVersion: ".*"/appVersion: "'"$VERSION_NEW"'"/g' "$ROOT_DIR/deployment/helm/charts/ocelot-neo4j/Chart.yaml"
sed -i -e 's/appVersion: ".*"/appVersion: "'"$VERSION_NEW"'"/g' "$ROOT_DIR/deployment/helm/charts/ocelot-social/Chart.yaml"
sed -i -e 's/^version: .*/version: '"$VERSION_NEW"'/' "$ROOT_DIR/deployment/helm/charts/ocelot-neo4j/Chart.yaml"
sed -i -e 's/^version: .*/version: '"$VERSION_NEW"'/' "$ROOT_DIR/deployment/helm/charts/ocelot-social/Chart.yaml"

# generate changelog
cd "$ROOT_DIR"
npx auto-changelog --commit-limit 0 --latest-version "$VERSION_NEW"