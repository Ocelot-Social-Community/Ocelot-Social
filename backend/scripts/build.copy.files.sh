#!/bin/sh

# html files
mkdir -p build/src/middleware/helpers/email/templates/
cp -r src/middleware/helpers/email/templates/*.html build/src/middleware/helpers/email/templates/

mkdir -p build/src/middleware/helpers/email/templates/en/
cp -r src/middleware/helpers/email/templates/en/*.html build/src/middleware/helpers/email/templates/en/

mkdir -p build/src/middleware/helpers/email/templates/de/
cp -r src/middleware/helpers/email/templates/de/*.html build/src/middleware/helpers/email/templates/de/

# gql files
mkdir -p build/src/schema/types/
cp -r src/schema/types/*.gql build/src/schema/types/

mkdir -p build/src/schema/types/enum/
cp -r src/schema/types/enum/*.gql build/src/schema/types/enum/

mkdir -p build/src/schema/types/scalar/
cp -r src/schema/types/scalar/*.gql build/src/schema/types/scalar/

mkdir -p build/src/schema/types/type/
cp -r src/schema/types/type/*.gql build/src/schema/types/type/