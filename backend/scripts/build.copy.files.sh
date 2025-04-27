#!/bin/sh

# html files
mkdir -p build/src/middleware/helpers/email/templates/
cp -r src/middleware/helpers/email/templates/*.html build/src/middleware/helpers/email/templates/

mkdir -p build/src/middleware/helpers/email/templates/en/
cp -r src/middleware/helpers/email/templates/en/*.html build/src/middleware/helpers/email/templates/en/

mkdir -p build/src/middleware/helpers/email/templates/de/
cp -r src/middleware/helpers/email/templates/de/*.html build/src/middleware/helpers/email/templates/de/

# gql files
mkdir -p build/src/graphql/types/
cp -r src/graphql/types/*.gql build/src/graphql/types/

mkdir -p build/src/graphql/types/enum/
cp -r src/graphql/types/enum/*.gql build/src/graphql/types/enum/

mkdir -p build/src/graphql/types/scalar/
cp -r src/graphql/types/scalar/*.gql build/src/graphql/types/scalar/

mkdir -p build/src/graphql/types/type/
cp -r src/graphql/types/type/*.gql build/src/graphql/types/type/