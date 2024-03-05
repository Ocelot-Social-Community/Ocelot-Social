#! /usr/bin/env bash

ROOT_DIR=$(dirname "$0")/../..
tmp=$(mktemp)

locale_list=("es.json" "fr.json" "it.json" "nl.json" "pl.json" "pt.json" "ru.json")

for locale_file in "${locale_list[@]}"
do
    jq -n \
       -f $(dirname "$0")/normalize-locales.jq \
       --argfile source $ROOT_DIR/webapp/locales/en.json \
       --argfile target $ROOT_DIR/webapp/locales/$locale_file \
       > "$tmp"
    mv "$tmp" $ROOT_DIR/webapp/locales/$locale_file
done

exit 0

