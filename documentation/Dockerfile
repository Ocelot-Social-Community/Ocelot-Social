# syntax=docker/dockerfile:1
#
# Documentation site (VuePress) with the embedded GraphQL API reference (SpectaQL).
# Self-contained on Node 20 (matching the docs deploy) so it does not share the
# backend's Alpine/Node-25 node_modules. Build context is the repo root.

# Node 22: the backend deps (metascraper) require Node >= 22, and this image runs
# the backend toolchain to print the schema for the API reference. VuePress builds
# fine on 22 too.
FROM node:22-bookworm-slim AS base
LABEL org.label-schema.name="ocelot.social:documentation"
LABEL org.label-schema.description="VuePress documentation site incl. the GraphQL API reference"
LABEL maintainer="devops@ocelot.social"
WORKDIR /workspace

FROM base AS development
# Pre-install both dependency trees at build time so `docker compose up docs`
# starts quickly; the mounted source keeps its own node_modules via anonymous
# volumes (see docker-compose.override.yml).
#
# The backend deps are needed only to print the schema and run SpectaQL, so skip
# native build scripts (re2 etc.) — none are used for documentation generation.
# Copy the lockfile too and use `npm ci`: it installs the exact locked tree
# deterministically and does NOT re-resolve, so the vuepress rc peer-dependency
# graph (theme-hope vs. search-pro) stays consistent instead of hitting ERESOLVE.
COPY package.json package-lock.json ./
COPY backend/package.json backend/yarn.lock ./backend/
RUN npm ci --no-audit --no-fund
RUN cd backend && yarn install --frozen-lockfile --ignore-scripts

# On start: regenerate the API reference into .vuepress/public/api, then serve the
# VuePress site (handbook + embedded /api) with live reload on all interfaces.
CMD ["sh", "-c", "npm run docs:api && npm run docs:dev -- --host 0.0.0.0 --port 8080"]
