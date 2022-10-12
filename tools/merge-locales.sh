#!/bin/bash

for locale in `ls locales/*.json`;
do
    file=$(basename $locale);
    if [ -f locales/tmp/$file ]; then
        jq -s '.[0] * .[1]' $locale locales/tmp/$file > locales/tmp/tmp.json;
        mv locales/tmp/tmp.json $locale;
    fi;
done;

rm -r locales/tmp/
