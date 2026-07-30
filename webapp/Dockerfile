# syntax=docker/dockerfile:1
FROM node:25.9.0-alpine AS ui-library
RUN apk --no-cache add git python3 make g++
RUN mkdir -p /app
WORKDIR /app
COPY packages/ui/package.json packages/ui/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
COPY packages/ui/. .
RUN npm run build

# Build the shared branding package (tsc -> dist). Placed at /packages/branding in `base` so the
# webapp's `file:../packages/branding` dependency resolves (context is already the repo root).
FROM node:25.9.0-alpine AS branding-library
RUN mkdir -p /app
WORKDIR /app
COPY packages/branding/package.json packages/branding/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
COPY packages/branding/. .
RUN npm run build

# The package has TWO disjoint roles, split into separate stages so the TypeScript compiler (~23 MB —
# needed ONLY to type-check and evaluate a brand's `brand.config.ts`, see scripts/lib/load-config.ts)
# never reaches a runtime image:
#   • branding-tools   — the brand-archive BUILDER (scripts/ + devDeps incl. typescript). Copied into
#                        `build` only, which is where the archive bake runs.
#   • branding-runtime — what the RUNNING app imports (dist/ + nanotar/tslib: the branding plugin and
#                        the branding-assets server middleware). devDeps pruned.
# `production` derives FROM base and copies only /build, so it inherits the runtime half alone.
FROM branding-library AS branding-tools

FROM branding-library AS branding-runtime
RUN npm prune --omit=dev

FROM node:25.9.0-alpine AS base
LABEL org.label-schema.name="ocelot.social:webapp"
LABEL org.label-schema.description="Web Frontend of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/webapp"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"
ENV NODE_ENV="production"
ENV PORT="3000"
EXPOSE ${PORT}
RUN apk --no-cache add git python3 make g++ bash jq
RUN mkdir -p /app
WORKDIR /app
COPY --from=ui-library ./app/ /packages/ui/
COPY --from=branding-runtime ./app/ /packages/branding/
# Where the running app reads brand archives (`<id>.tar.gz`) + the baked default marker (DEFAULT).
# A branded build (--build-arg BRAND=<name>) bakes them here; a vanilla image leaves it empty (→ the
# app runs on framework defaults). Ops can override this to a mounted volume of archives.
ENV OCELOT_BRANDING_ASSETS_DIR="/app/branding-assets"
CMD ["/bin/bash", "-c", "yarn run start"]

FROM base AS development
CMD ["/bin/bash", "-c", "yarn install && yarn run dev"]

FROM base AS build
# package.json-first: cache the dev-dependency install as its own layer (branding is config/assets only
# and never changes dependencies, so this layer stays valid across brands).
COPY webapp/package.json webapp/yarn.lock ./
COPY webapp/scripts ./scripts/
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
COPY webapp/ .
# The nuxt bundle is BRAND-AGNOSTIC — branding is applied at RUNTIME from the archive — so build it
# BEFORE `ARG BRAND`. This (expensive) layer is then cached across EVERY branded build; only the cheap
# archive-bake + assembly below re-run when BRAND changes. (The cache mount also persists the
# webpack/babel cache for incremental rebuilds when the webapp source itself changes.)
RUN --mount=type=cache,target=/app/node_modules/.cache,sharing=locked \
    yarn run build
# Per-brand, AFTER the cached build: bake <id>.tar.gz + DEFAULT marker into ./branding-assets. The app
# applies colours/logos/title/OG/manifest/static pages/locales (and the backend's e-mail/public
# overlays) at RUNTIME from that archive, so the nuxt bundle above stays brand-agnostic and cached.
# The builder is copied in AFTER the nuxt build so it cannot invalidate that expensive cached layer;
# it stays in this stage only — `production` is FROM base + COPY /build and never inherits it.
COPY --from=branding-tools ./app/ /brand-tools/
# Path 1 — MONOREPO build (docker compose, ocelot's own branded images): the brand's TYPED config is
# read from deployment/configurations/<BRAND>, bind-mounted so no brand data lands in a layer. Pick it
# with `--build-arg BRAND=<name>`; empty = vanilla. A plain RUN: it executes HERE and never downstream.
ARG BRAND=""
RUN --mount=type=bind,source=deployment/configurations,target=/brands \
    if [ -n "$BRAND" ] && ls "/brands/$BRAND/branding/brand.config."* >/dev/null 2>&1; then \
      node /brand-tools/scripts/build-brand-archive.ts "/brands/$BRAND/branding" ./branding-assets --default && \
      echo "[branding] baked brand: $BRAND"; \
    else \
      echo "[branding] BRAND unset/unknown ('$BRAND') — vanilla ocelot.social"; \
    fi
# A brand repo doing `FROM webapp-build` gets NO archive baked in — deliberately. The running webapp
# acquires the archives (and the DEFAULT marker) from the backend over GET /branding/… and mirrors
# them into $OCELOT_BRANDING_ASSETS_DIR (server-middleware/branding-sync.js), so a brand is deployed
# in ONE place: the backend. Baking a second copy here would also let a stale sibling out-rank the
# synced one — discovery keeps one archive per id and breaks a version tie by walk order.
#
# The assembly below still has to be ONBUILD: only ONBUILD triggers re-run in the child build, and a
# plain RUN would leave the brand image with the /build that ocelot CI assembled.
ONBUILD RUN mkdir /build && \
    cp -r ./.nuxt ./nuxt.config.js ./config ./constants ./static ./locales ./server-middleware ./package.json ./yarn.lock ./scripts /build && \
    if [ -d ./branding-assets ]; then cp -r ./branding-assets /build/branding-assets; fi
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --production=true --frozen-lockfile --non-interactive --cache-folder /yarn-cache

FROM base AS test_build
ENV NODE_ENV=test
COPY webapp/package.json webapp/yarn.lock ./
COPY webapp/scripts ./scripts/
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
COPY webapp/. .
RUN yarn run build
RUN mkdir /build && \
    cp -r ./.nuxt ./nuxt.config.js ./config ./constants ./static ./locales ./server-middleware ./package.json ./yarn.lock ./scripts /build
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --frozen-lockfile --non-interactive --cache-folder /yarn-cache

FROM test_build AS test
CMD ["/bin/bash", "-c", "yarn run dev"]

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
