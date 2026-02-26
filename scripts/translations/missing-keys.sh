#! /usr/bin/env bash

ROOT_DIR=$(dirname "$0")/../..
LOCALES_DIR="$ROOT_DIR/webapp/locales"

sorting="jq -f $ROOT_DIR/scripts/translations/sort_filter.jq"
english="$sorting $LOCALES_DIR/en.json"
listPaths="jq -c 'path(..)|[.[]|tostring]|join(\".\")'"

has_error=0

for file in "$LOCALES_DIR"/*.json; do
  lang=$(basename "$file" .json)

  # skip english itself
  if [ "$lang" = "en" ]; then
    continue
  fi

  other="$sorting $file"
  diffString="<( $english | $listPaths ) <( $other | $listPaths )"

  if eval "diff -q $diffString" > /dev/null 2>&1; then
    : # all good
  else
    eval "diff -y $diffString | grep '[|<>]'"
    printf "\nEnglish and %s (%s) translation keys do not match, see diff above.\n\n" "$lang" "$file"
    has_error=1
  fi
done

if [ "$has_error" -eq 1 ]; then
  exit 1
fi
