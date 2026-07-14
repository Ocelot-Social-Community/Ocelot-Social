#!/bin/bash

# Brand categories overlay (branding/constants/categories.js) → the .ts the DB seeder imports.
# (emails/logos/metadata config used to be baked here too, but are now read from @ocelot-social/branding
# at runtime, so only categories — brand seed data — still needs this.)
[ -f src/constants/categories.js ] && mv src/constants/categories.js src/constants/categories.ts
exit 0
