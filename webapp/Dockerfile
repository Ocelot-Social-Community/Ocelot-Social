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

# Same split as branding below, for the same reason: the FULL dev install (typescript, storybook,
# playwright, api-extractor — ~470 MB) BUILDS dist/ and is needed for nothing afterwards. Without this
# stage that tree shipped TWICE in the production image, ~900 MB of a 1.94 GB total: once as
# /packages/ui, and again inside /app/node_modules/@ocelot-social/ui, because yarn copies a `file:`
# dependency's directory VERBATIM — `"files": ["dist"]` governs `npm publish`, not a `file:` install.
# What actually has to survive is what nuxt.config.js looks for (`/packages/ui/dist`) plus the four
# runtime deps npm keeps. src/ and examples/ are build inputs only; they cannot go in .dockerignore
# because `npm run build` above reads src/.
#
# `--omit=optional` is not cosmetic: typescript (23 MB, over half of what `--omit=dev` alone leaves)
# is marked devOptional in the lockfile, because Vue 3 declares it as an OPTIONAL peer — so `--omit=dev`
# keeps it. Nothing here consumes optional deps at runtime; the webapp only ever reads dist/.
FROM ui-library AS ui-runtime
RUN npm prune --omit=dev --omit=optional && rm -rf src examples

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
# `bash` only — this is the RUNTIME base (`production` derives FROM it), and the CMD below is the sole
# thing that needs it. The node-gyp toolchain lives in `base-build` instead: python3 + gcc were 319 MB
# of a 1.94 GB runtime image and are used by `yarn install` alone. `git` and `jq` are gone entirely —
# no dependency in yarn.lock resolves from a git URL, and the only jq consumers are the host-side
# scripts/translations/*.sh, which are not in this image.
RUN apk --no-cache add bash
# NOTE for anyone tempted to `rm -rf /usr/local/lib/node_modules/npm` here to reclaim its 16 MB (plus
# 6.7 MB of node-gyp headers in /usr/local/include): it reclaims NOTHING. Those bytes belong to a layer
# of node:25.9.0-alpine itself, and a delete in a descendant layer only adds a whiteout on top. The one
# construction that would actually drop them is assembling the runtime from plain `alpine` + a COPYed
# node binary + yarn — worth ~12 MB of a ~495 MB image, at the price of owning musl/libgcc/entrypoint
# details the official image handles. Measured and deliberately not done.
RUN mkdir -p /app
WORKDIR /app
COPY --from=ui-runtime ./app/ /packages/ui/
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

# Everything that RUNS `yarn install` derives from here rather than from `base`: node-pre-gyp compiles
# native addons and needs python3/make/g++. `production` deliberately does NOT — it only ever receives
# the finished /build, so the toolchain never reaches a running image.
FROM base AS base-build
RUN apk --no-cache add python3 make g++

# Installs at container START, hence the toolchain.
FROM base-build AS development
CMD ["/bin/bash", "-c", "yarn install && yarn run dev"]

FROM base-build AS build
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
    cp -r ./.nuxt ./nuxt.config.js ./config ./constants ./static ./locales ./server-middleware ./utils ./package.json ./yarn.lock ./scripts /build && \
    if [ -d ./deployment ]; then cp -r ./deployment /build/deployment; fi
# Drop the CLIENT source maps — they were 45 MB of a 67 MB .nuxt. Sentry has already consumed them:
# publishRelease uploads during `yarn run build` above (nuxt.config.js `sentry.publishRelease`), so
# symbolication survives; what goes is only the copy webpack would otherwise serve under /_nuxt/, i.e.
# the browser-readable mirror of our sources. The SERVER maps stay — they are small and are what turns
# an SSR stack trace into something readable.
ONBUILD RUN find /build/.nuxt/dist/client -name '*.map' -delete
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --production=true --frozen-lockfile --non-interactive --cache-folder /yarn-cache

FROM base-build AS test_build
ENV NODE_ENV=test
COPY webapp/package.json webapp/yarn.lock ./
COPY webapp/scripts ./scripts/
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
COPY webapp/. .
RUN yarn run build
RUN mkdir /build && \
    cp -r ./.nuxt ./nuxt.config.js ./config ./constants ./static ./locales ./server-middleware ./utils ./package.json ./yarn.lock ./scripts /build
# Production install — which is only safe because `vue-template-compiler` is now a real dependency in
# webapp/package.json. Nuxt 2 does not bundle node_modules into the SSR build; it externalises them
# and `require`s them at request time (grep the built .nuxt/dist/server/server.js). That compiler
# arrived only as a transitive dependency of `nuxt`, a devDependency, so a production install dropped
# it — and the route that needs it, /groups/:id/:slug, answered 500 while /login and /profile/*
# rendered fine. The container logs nothing in that case, so it reads as a broken page rather than a
# missing module. Before adding a `--production` flag anywhere in this file, re-run the check that
# found it: extract every bare `require("…")` from .nuxt/dist/server/ and diff against node_modules/.
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --production=true --frozen-lockfile --non-interactive --cache-folder /yarn-cache

# The test image has TWO consumers with opposite needs, hence two stages off the same build:
#   • test — the webapp UNIT tests (.github/workflows/test-webapp.yml runs `docker compose exec webapp
#            yarn test`). Jest needs the sources and all 45 devDependencies, so this one keeps the whole
#            /app tree. Its CMD only has to keep the container alive for the `exec`.
#   • e2e  — the CYPRESS matrix (.github/workflows/test-e2e.yml). That workflow `docker save`s the image
#            and pulls it down again in EVERY one of the 40 matrix jobs, so nothing that only the build
#            needed may ride along.
FROM test_build AS test
CMD ["/bin/bash", "-c", "yarn run dev"]

# Same shape as `production` below — `FROM base` + the assembled /build — and for the same reason.
# Deriving this from `test_build` shipped the node-gyp toolchain, the webapp sources and a second,
# complete node_modules tree to all 40 jobs.
#
# It also inherits base's `yarn run start` (nuxt-start) instead of `yarn run dev`. The dev server
# rebuilt the entire webpack bundle at container start — in every matrix job, while the workflow sat in
# its `until curl localhost:3000` loop — and then ignored the `.nuxt` that `yarn run build` above had
# already produced. Nothing in the e2e run needs it: coverage is not instrumented in this build (no
# babel-plugin-istanbul in nuxt.config.js — the ./coverage mount in docker-compose.test.yml is Jest's),
# and HMR has no consumer when the client is Cypress.
FROM base AS e2e
COPY --from=test_build /build .

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
