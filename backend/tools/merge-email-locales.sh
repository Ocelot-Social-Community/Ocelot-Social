#!/bin/bash

# Deep-merge branding email locales into the defaults.
# Branding overrides live in src/emails/locales/tmp/<lang>.json and are
# merged on top of src/emails/locales/<lang>.json using `jq`'s `*` operator
# (right-hand side wins, untouched keys are preserved).

set -e

for locale in `ls src/emails/locales/*.json`;
do
    file=$(basename $locale);
    if [ -f src/emails/locales/tmp/$file ]; then
        jq -s '.[0] * .[1]' $locale src/emails/locales/tmp/$file > src/emails/locales/tmp/tmp.json;
        mv src/emails/locales/tmp/tmp.json $locale;
    fi;
done;

rm -r src/emails/locales/tmp/
