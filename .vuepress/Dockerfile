# syntax=docker/dockerfile:1
#
# Static documentation site: the VuePress handbook with the embedded GraphQL API
# reference (SpectaQL) at /api, served by nginx. Multi-stage so the backend
# toolchain and VuePress each get a clean tree, then only the static output ships.
#
# The VuePress deps are declared in the repo-root package.json: VuePress resolves
# `vuepress`/`vuepress-theme-hope` (config imports + its CLI) relative to the source
# dir, which is the repo root — so they must live in the root node_modules, not a
# subfolder. `npm ci` installs them there.
#
# Build context is the repo root; see .vuepress/Dockerfile.dockerignore.

# 0) The backend's `@ocelot-social/branding` is a `file:../packages/branding` dependency, so the
#    package has to exist at that path BEFORE the install below — src/graphql imports it, which is
#    what schema:print loads. Building it here is not new caution: the previous version installed
#    the backend with only ./backend/ in the tree, so the dependency pointed at nothing.
FROM node:26-bookworm-slim AS branding
WORKDIR /app
COPY packages/branding/package.json packages/branding/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY packages/branding/. .
RUN npm run build

# 1) Generate the GraphQL API reference on the backend's Node (schema:print + SpectaQL).
FROM node:26-bookworm-slim AS apidocs
WORKDIR /repo
COPY --from=branding /app/ ./packages/branding/
# `.npmrc` carries install-links=true; without it `npm ci` rejects this lockfile outright (exit 1).
COPY backend/package.json backend/package-lock.json backend/.npmrc ./backend/
RUN cd backend && npm ci --ignore-scripts --no-audit --no-fund
COPY backend/ ./backend/
RUN cd backend \
    && npm run schema:print \
    && ./node_modules/.bin/spectaql --target-dir /api spectaql.yml

# 2) Build the VuePress site (Node 20), embedding the API reference at /api.
FROM node:26-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
# Retry once: esbuild's postinstall can hit a transient ETXTBSY race on some
# Docker filesystems (overlayfs); a second pass finds the binary settled.
RUN npm ci --no-audit --no-fund || npm ci --no-audit --no-fund
COPY . .
COPY --from=apidocs /api ./.vuepress/public/api
RUN NODE_OPTIONS=--openssl-legacy-provider npm run docs:build

# 3) Serve the static output.
# nginx-unprivileged runs as a non-root user (UID 101) and listens on 8080,
# so the final image has no root process (addresses Trivy DS-0002).
FROM nginxinc/nginx-unprivileged:alpine AS production
LABEL org.label-schema.name="ocelot.social:documentation"
LABEL maintainer="devops@ocelot.social"
COPY --from=build /repo/.vuepress/dist /usr/share/nginx/html
