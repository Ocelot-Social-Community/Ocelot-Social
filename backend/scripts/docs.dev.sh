#!/bin/sh

# Live-reloading GraphQL API docs for development.
#
# SpectaQL renders the *printed* augmented schema (schema.graphql), not the
# hand-written .gql files. So we run two things:
#   1. a nodemon watcher that re-runs `schema:print` whenever a .gql source
#      changes, refreshing schema.graphql
#   2. `spectaql -D` (development mode) which serves the docs, watches
#      schema.graphql and live-reloads the browser on change
#
# Serves on http://localhost:4400 (live-reload channel on 4401).

set -e

# Initial schema so spectaql has something to render on boot.
yarn run schema:print

# Watch the SDL sources and re-print the schema on change (background).
./node_modules/.bin/nodemon \
  --quiet \
  --watch src/graphql/types \
  --ext gql \
  --exec 'yarn run schema:print' &
WATCHER_PID=$!

# Make sure the watcher dies with this script.
trap 'kill "$WATCHER_PID" 2>/dev/null || true' EXIT INT TERM

# Serve + watch schema.graphql + live reload (foreground).
exec ./node_modules/.bin/spectaql --development-mode-live --port 4400 --port-live 4401 spectaql.yml
