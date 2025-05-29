#!/bin/sh

# public
cp -r public/ build/public/

# email files
mkdir -p build/src/emails/templates/
cp -r src/emails/templates/ build/src/emails/

mkdir -p build/src/emails/locales/
cp -r src/emails/locales/ build/src/emails/

# gql files
mkdir -p build/src/graphql/types/
cp -r src/graphql/types/*.gql build/src/graphql/types/

mkdir -p build/src/graphql/types/enum/
cp -r src/graphql/types/enum/*.gql build/src/graphql/types/enum/

mkdir -p build/src/graphql/types/scalar/
cp -r src/graphql/types/scalar/*.gql build/src/graphql/types/scalar/

mkdir -p build/src/graphql/types/type/
cp -r src/graphql/types/type/*.gql build/src/graphql/types/type/