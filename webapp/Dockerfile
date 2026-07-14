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
COPY --from=branding-library ./app/ /packages/branding/
# Where the running app reads brand archives (`<id>.tar.gz`) + the baked default marker (DEFAULT).
# A branding build bakes them here (see the ONBUILD block); a vanilla image leaves it empty (→ the
# app runs on framework defaults). Ops can override this to a mounted volume of archives.
ENV OCELOT_BRANDING_ASSETS_DIR="/app/branding-assets"
CMD ["/bin/bash", "-c", "yarn run start"]

FROM base AS development
CMD ["/bin/bash", "-c", "yarn install && yarn run dev"]

FROM base AS build
# package.json-first: bake the dev-dependency install into the webapp-build base image
# as its own cacheable layer (mirrors the test_build stage). Branding overlays are
# build-time assets/config/locales only and never change dependencies, so node_modules
# baked here stays valid for every downstream branding build — turning the per-build
# ONBUILD install from a cold ~2min install into a fast integrity check.
COPY webapp/package.json webapp/yarn.lock ./
COPY webapp/scripts ./scripts/
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
COPY webapp/ .
# Runtime branding: copy the brand UNFLATTENED into /brand and bake its archive (+ DEFAULT marker) into
# ./branding-assets, so the image ships this brand as its default theme WITHOUT rebuilding the bundle
# per brand — colours/logos/title/OG/manifest/static pages/locales are all applied at runtime from the
# archive. A vanilla build (no brand.config) skips this and stays vanilla.
ONBUILD COPY webap[p]/brandin[g]/ /brand/
ONBUILD COPY brandin[g]/ /brand/
ONBUILD RUN if ls /brand/brand.config.* >/dev/null 2>&1; then \
      node /packages/branding/scripts/build-brand-archive.mjs /brand ./branding-assets --default; \
    else echo "[branding] no typed brand.config — runtime archive skipped (vanilla)"; fi
# node_modules is baked above; with an unchanged lockfile this resolves in seconds
# (integrity check), not a full reinstall. Kept as a guard in case a branding build
# ever overrides dependencies (then --frozen-lockfile correctly forces a fresh install).
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
# Persist the webpack/babel cache (nuxt build.cache + babel cacheDirectory write to
# node_modules/.cache) so incremental rebuilds on a durable builder reuse it.
ONBUILD RUN --mount=type=cache,target=/app/node_modules/.cache,sharing=locked \
    yarn run build
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
