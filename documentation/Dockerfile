# syntax=docker/dockerfile:1
#
# Static documentation site: the VuePress handbook with the embedded GraphQL API
# reference (SpectaQL) at /api, served by nginx. Multi-stage so each tool runs on
# the Node version it needs (the backend toolchain needs Node 25; VuePress builds
# on Node 20), then only the static output ships.
#
# Build context is the repo root; see documentation/Dockerfile.dockerignore.

# 1) Generate the GraphQL API reference on the backend's Node (schema:print + SpectaQL).
FROM node:25-bookworm-slim AS apidocs
WORKDIR /repo
COPY backend/package.json backend/yarn.lock ./backend/
RUN cd backend && yarn install --frozen-lockfile --ignore-scripts
COPY backend/ ./backend/
RUN cd backend \
    && yarn run schema:print \
    && ./node_modules/.bin/spectaql --target-dir /api spectaql.yml

# 2) Build the VuePress site (Node 20), embedding the API reference at /api.
FROM node:20-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
# Retry once: esbuild's postinstall can hit a transient ETXTBSY race on some
# Docker filesystems (overlayfs); a second pass finds the binary settled.
RUN npm ci --no-audit --no-fund || npm ci --no-audit --no-fund
COPY . .
COPY --from=apidocs /api ./.vuepress/public/api
RUN NODE_OPTIONS=--openssl-legacy-provider npm run docs:build

# 3) Serve the static output.
FROM nginx:alpine AS production
LABEL org.label-schema.name="ocelot.social:documentation"
LABEL maintainer="devops@ocelot.social"
COPY --from=build /repo/.vuepress/dist /usr/share/nginx/html
