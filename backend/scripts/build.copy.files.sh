#!/bin/bash

# html files
mkdir -p build/middleware/helpers/email/templates/
cp -r src/middleware/helpers/email/templates/*.html build/middleware/helpers/email/templates/

mkdir -p build/middleware/helpers/email/templates/en/
cp -r src/middleware/helpers/email/templates/en/*.html build/middleware/helpers/email/templates/en/

mkdir -p build/middleware/helpers/email/templates/de/
cp -r src/middleware/helpers/email/templates/de/*.html build/middleware/helpers/email/templates/de/

# gql files
mkdir -p build/schema/types/
cp -r src/schema/types/*.gql build/schema/types/

mkdir -p build/schema/types/enum/
cp -r src/schema/types/enum/*.gql build/schema/types/enum/

mkdir -p build/schema/types/scalar/
cp -r src/schema/types/scalar/*.gql build/schema/types/scalar/

mkdir -p build/schema/types/type/
cp -r src/schema/types/type/*.gql build/schema/types/type/