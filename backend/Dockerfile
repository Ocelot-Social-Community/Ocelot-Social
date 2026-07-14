# syntax=docker/dockerfile:1

# Build the shared branding package (tsc -> dist). Placed at /packages/branding in `base` so the
# backend's `file:../packages/branding` dependency resolves. Requires the repo-root build context
# (see docker-compose*.yml / .github/workflows — backend now builds with `context: .`).
FROM node:25.9.0-alpine AS branding-library
RUN mkdir -p /app
WORKDIR /app
COPY packages/branding/package.json packages/branding/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
COPY packages/branding/. .
RUN npm run build

FROM node:25.9.0-alpine AS base
LABEL org.label-schema.name="ocelot.social:backend"
LABEL org.label-schema.description="Backend of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/backend"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"
ENV NODE_ENV="production"
ENV PORT="4000"
EXPOSE ${PORT}
RUN apk --no-cache add git python3 make g++ bash linux-headers
RUN mkdir -p /app
WORKDIR /app
COPY --from=branding-library ./app/ /packages/branding/
# Where the running backend reads the deployed brand's archive (`<id>.tar.gz`) + baked default marker
# (DEFAULT). A branding build bakes them here (see ONBUILD); vanilla leaves it empty (→ framework
# defaults). Ops can override to a mounted volume, or pin a brand with $OCELOT_ACTIVE_BRANDING.
ENV OCELOT_BRANDING_ASSETS_DIR="/app/branding-assets"
CMD ["/bin/bash", "-c", "yarn run start"]

FROM base AS development
CMD ["/bin/sh", "-c", "yarn install && yarn run dev"]

FROM base AS build
# Repo-root build context now (for /packages/branding): copy only the backend subtree to /app.
COPY backend/ .
# copy categories to brand them (use yarn prod:db:data:categories)
ONBUILD COPY ./branding/constants/ src/constants/
ONBUILD RUN tools/replace-constants.sh
# Email templates: optionally overlay branding pug templates onto src/emails/templates/
ONBUILD COPY brandin[g]/emails/templates/ src/emails/templates/
# Email locales: optionally deep-merge branding translations into src/emails/locales/*.json
ONBUILD COPY brandin[g]/emails/locales/*.jso[n] src/emails/locales/tmp/
ONBUILD RUN if [ -d src/emails/locales/tmp ]; then apk add --no-cache jq bash && tools/merge-email-locales.sh; fi
ONBUILD COPY ./branding/middlewares/ src/middleware/branding/
ONBUILD COPY ./branding/data/ src/db/data
ONBUILD COPY ./branding/public/ public/
# Runtime branding (additive to the overlays above): copy the brand UNFLATTENED into /brand and bake
# its archive (+ DEFAULT marker) into ./branding-assets, so the backend picks up this brand's config
# (group limits / e-mail identity) at startup via src/branding/bootstrap.ts — no per-brand rebuild.
# The overlay copies above still bring in not-yet-ported content (categories, e-mail templates/locales,
# middlewares, seed data).
# A vanilla build (no brand.config) skips this and stays vanilla.
ONBUILD COPY brandin[g]/ /brand/
ONBUILD RUN if ls /brand/brand.config.* >/dev/null 2>&1; then \
      node /packages/branding/scripts/build-brand-archive.mjs /brand ./branding-assets --default; \
    else echo "[branding] no typed brand.config — runtime archive skipped (vanilla)"; fi
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
ONBUILD RUN yarn run build
ONBUILD RUN mkdir /build && \
    cp -r ./build ./public ./package.json ./yarn.lock /build && \
    if [ -d ./branding-assets ]; then cp -r ./branding-assets /build/branding-assets; fi
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --production=true --frozen-lockfile --non-interactive --cache-folder /yarn-cache

FROM build AS test
# required for the migrations
# ONBUILD RUN cp -r ./src /src
CMD ["/bin/bash", "-c", "yarn run dev"]

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
