#! /usr/bin/env bash

# Every right in the two permission catalogs needs a translation in webapp/locales/en.json, and no
# translation may outlive its right:
# - network rights (backend/src/permission/permission.catalog.json) under `admin.roles.perm`,
# - group rights (backend/src/groupPermission/groupPermission.catalog.json) under `group.rights.perm`,
# each keyed by the catalog key with its dots as underscores (see webapp/utils/permissionLabel.js).
# The other languages are held to en.json's keys by missing-keys.sh.

ROOT_DIR=$(dirname "$0")/../..
ENGLISH="$ROOT_DIR/webapp/locales/en.json"

has_error=0

check() {
  local catalog=$1 namespace=$2
  local keys translations missing stale
  keys=$(jq -r '.permissions | keys[] | gsub("\\."; "_")' "$catalog" | sort)
  translations=$(jq -r --arg ns "$namespace" 'getpath($ns | split(".")) // {} | keys[]' "$ENGLISH" | sort)

  if [ -z "$keys" ]; then
    printf "No permissions found in %s.\n" "$catalog"
    has_error=1
    return
  fi

  missing=$(comm -23 <(echo "$keys") <(echo "$translations"))
  stale=$(comm -13 <(echo "$keys") <(echo "$translations"))

  if [ -n "$missing" ]; then
    printf "Rights in %s without a translation in %s (%s.<key>):\n%s\n\n" "$catalog" "$ENGLISH" "$namespace" "$missing"
    has_error=1
  fi
  if [ -n "$stale" ]; then
    printf "Translations in %s (%s) without a right in %s:\n%s\n\n" "$ENGLISH" "$namespace" "$catalog" "$stale"
    has_error=1
  fi
}

check "$ROOT_DIR/backend/src/permission/permission.catalog.json" "admin.roles.perm"
check "$ROOT_DIR/backend/src/groupPermission/groupPermission.catalog.json" "group.rights.perm"

exit $has_error
