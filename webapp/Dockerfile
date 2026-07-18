# syntax=docker/dockerfile:1
FROM node:26.5.0-alpine AS ui-library
RUN apk --no-cache add git python3 make g++
RUN mkdir -p /app
WORKDIR /app
COPY packages/ui/package.json packages/ui/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
COPY packages/ui/. .
RUN npm run build

FROM node:26.5.0-alpine AS base
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
# branding is unified in /branding in branding repositories
ONBUILD COPY webap[p]/brandin[g]/ .
ONBUILD COPY brandin[g]/ .
ONBUILD RUN tools/merge-locales.sh
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
    cp -r ./.nuxt ./nuxt.config.js ./config ./constants ./static ./locales ./package.json ./yarn.lock ./scripts /build
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --production=true --frozen-lockfile --non-interactive --cache-folder /yarn-cache

FROM base AS test_build
ENV NODE_ENV=test
COPY webapp/package.json webapp/yarn.lock ./
COPY webapp/scripts ./scripts/
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
COPY webapp/. .
RUN tools/merge-locales.sh
RUN yarn run build
RUN mkdir /build && \
    cp -r ./.nuxt ./nuxt.config.js ./config ./constants ./static ./locales ./package.json ./yarn.lock ./scripts /build
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --frozen-lockfile --non-interactive --cache-folder /yarn-cache

FROM test_build AS test
CMD ["/bin/bash", "-c", "yarn run dev"]

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
