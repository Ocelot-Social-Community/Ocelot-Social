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
# No branding env is set here, deliberately — the code defaults cover this image AND a repo checkout
# (see @ocelot-social/branding discover.DEFAULT_ROOTS / DEFAULT_CACHE_DIR):
#   ./.branding-cache            WRITTEN by server-middleware/branding-sync.js, which owns it alone;
#                                always the FIRST place read, because it mirrors the backend — the
#                                single source of truth for which brands exist.
#   ./deployment/configurations  READ-only fallback: what a branded build BAKED in (see ONBUILD), used
#                                until the first sync lands, so the image never flashes vanilla when
#                                the backend is slow or down. Absent on a vanilla image.
# DEFAULT_ROOTS also carries `../deployment/configurations`, the same directory as seen from a repo
# checkout — one directory up from /app, so it simply does not exist here and is skipped. Listing both
# is what lets ONE default be right in the image and under `yarn dev`.
# Ops replace the read side with $OCELOT_BRANDING_ASSETS_DIR (`:`-separated, an earlier root shadows a
# later one per brand id) and move the cache with $OCELOT_BRANDING_CACHE_DIR. The cache stays first
# either way; it is not part of the configurable path.
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
# Per-brand, AFTER the cached build: bake <id>.tar.gz + DEFAULT marker into ./deployment/configurations
# — the discovery root, named exactly as in a repo checkout so the running code finds it without being
# told where to look. The app applies colours/logos/title/OG/manifest/static pages/locales at RUNTIME
# from that archive, so the nuxt bundle above stays brand-agnostic and cached. The builder is copied in
# AFTER the nuxt build so it cannot invalidate that expensive cached layer; it stays in this stage only
# — `production` is FROM base + COPY /build and never inherits it.
#
# The baked copy is a FALLBACK, not the delivery route: at runtime the webapp mirrors the backend's
# archives into its cache, which precedes this directory on the search path, so the synced brand always
# wins and the baked one only covers the window before the first successful sync. That is its whole
# purpose — a brand image must never render vanilla because the backend is slow or down.
COPY --from=branding-tools ./app/ /brand-tools/
# Path 1 — MONOREPO build (docker compose, ocelot's own branded images): the brand's TYPED config is
# read from deployment/configurations/<BRAND>, bind-mounted so no brand data lands in a layer. Pick it
# with `--build-arg BRAND=<name>`; empty = vanilla. A plain RUN: it executes HERE and never downstream.
ARG BRAND=""
RUN --mount=type=bind,source=deployment/configurations,target=/brands \
    if [ -n "$BRAND" ] && ls "/brands/$BRAND/branding/brand.config."* >/dev/null 2>&1; then \
      node /brand-tools/scripts/build-brand-archive.ts "/brands/$BRAND/branding" ./deployment/configurations --default && \
      echo "[branding] baked brand: $BRAND"; \
    else \
      echo "[branding] BRAND unset/unknown ('$BRAND') — vanilla ocelot.social"; \
    fi
# Path 2 — BRAND REPO build (`FROM webapp-build`, context = brand repo root): same bake, from the
# repo's own ./branding/. ONBUILD because only ONBUILD re-runs in the child build. The `[g]` glob makes
# the copy optional, so ocelot's own vanilla self-build (no ./branding/) skips it — the same idiom the
# backend uses.
#
# This is what keeps a brand image branded on its own: without it the webapp would start vanilla and
# only become branded once the backend answered, which is exactly the flash a down backend turns
# permanent. The second copy costs a stale-archive risk, and that is contained by the search path: the
# cache out-ranks this directory the moment a sync lands, so a brand that changed only ever shows the
# baked version until the backend has been reached — never after.
ONBUILD COPY brandin[g]/ /brand/
ONBUILD RUN if ls /brand/brand.config.* >/dev/null 2>&1; then \
      node /brand-tools/scripts/build-brand-archive.ts /brand ./deployment/configurations --default; \
    else echo "[branding] no typed brand.config — runtime archive skipped (vanilla)"; fi
# The assembly below also has to be ONBUILD: a plain RUN would leave the brand image with the /build
# that ocelot CI assembled.
ONBUILD RUN mkdir /build && \
    cp -r ./.nuxt ./nuxt.config.js ./config ./constants ./static ./locales ./server-middleware ./package.json ./yarn.lock ./scripts /build && \
    if [ -d ./deployment ]; then cp -r ./deployment /build/deployment; fi
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
