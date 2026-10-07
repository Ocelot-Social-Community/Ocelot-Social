#! /usr/bin/env bash

# Every error code the backend can send (backend/src/graphql/errorRegistry.ts) needs a translation
# under `backendErrors.<CODE>` in webapp/locales/en.json, and no translation may outlive its code.
# The other languages are held to en.json's keys by missing-keys.sh.

ROOT_DIR=$(dirname "$0")/../..
REGISTRY_FILE="$ROOT_DIR/backend/src/graphql/errorRegistry.ts"
ENGLISH="$ROOT_DIR/webapp/locales/en.json"

codes=$(sed -nE "s/^  ([A-Z_]+): \{ ?type:.*/\1/p; s/^  ([A-Z_]+): \{$/\1/p" "$REGISTRY_FILE" | sort)
keys=$(jq -r '(.backendErrors // {}) | keys[] | select(. != "generic")' "$ENGLISH" | sort)

if [ -z "$codes" ]; then
  printf "No error codes found in %s.\n" "$REGISTRY_FILE"
  exit 1
fi

missing=$(comm -23 <(echo "$codes") <(echo "$keys"))
stale=$(comm -13 <(echo "$codes") <(echo "$keys"))

if [ -n "$missing" ]; then
  printf "Error codes without a translation in %s (backendErrors.<CODE>):\n%s\n\n" "$ENGLISH" "$missing"
fi
if [ -n "$stale" ]; then
  printf "Translations in %s without an error code in %s:\n%s\n\n" "$ENGLISH" "$REGISTRY_FILE" "$stale"
fi

if [ -n "$missing" ] || [ -n "$stale" ]; then
  exit 1
fi
