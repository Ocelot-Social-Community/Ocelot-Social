# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Build UI library
# ==============================================================================
FROM node:26.4.0-alpine AS ui-library
RUN apk --no-cache add git python3 make g++
WORKDIR /packages/ui
COPY packages/ui/ .
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
RUN npm run build

# ==============================================================================
# Stage 1b: Build the shared branding package (tsc -> dist), incl. its scripts + node_modules
# (typescript), so the maintenance branding generator can resolve the package and load a brand's
# typed brand.config.ts when baking the brand in the build stage.
#
# Unlike backend/webapp, maintenance uses this package PURELY as a build tool: it has no
# `file:../packages/branding` dependency and its production stage is nginx serving the generated
# static output, so nothing of it can reach a runtime image. Hence no pruned runtime counterpart —
# the devDeps (typescript, needed to type-check + evaluate a brand's brand.config.ts) simply stay.
# ==============================================================================
FROM node:26.4.0-alpine AS branding-tools
WORKDIR /app
COPY packages/branding/package.json packages/branding/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
COPY packages/branding/. .
RUN npm run build

# ==============================================================================
# Stage 2: Install dependencies and copy sources
# ==============================================================================
FROM node:26.4.0-alpine AS base
RUN apk --no-cache add git python3 make g++
WORKDIR /app
COPY --from=ui-library /packages/ui/ /packages/ui/
COPY --from=branding-tools /app/ /brand-tools/
COPY maintenance/package.json maintenance/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci
COPY maintenance/ .

# ==============================================================================
# Stage 3: Development (hot-reload with mounted sources)
# ==============================================================================
FROM base AS development
# Bake the selected brand (same as the build stage) so `docker compose up` shows the branded
# maintenance page in dev too. NOTE: the compose override must NOT bind-mount ./maintenance/app,
# otherwise the mounted vanilla sources shadow the baked branding. BRAND is passed through from the
# compose build args (default yunite.me via ${MAINTENANCE_BRAND}); empty = vanilla.
ARG BRAND=""
# Bind-mount the brand configs only for THIS step (BuildKit) so no brand data — least of all the
# other, non-selected brands — is baked into the dev image layer. Read-only: the generator only reads.
RUN --mount=type=bind,source=deployment/configurations,target=/brands \
    if [ -n "$BRAND" ] && { [ -f "/brands/$BRAND/branding/brand.config.ts" ] || [ -f "/brands/$BRAND/branding/brand.config.mjs" ]; }; then \
      node /brand-tools/scripts/build-maintenance-branding.ts "/brands/$BRAND/branding" /app && \
      echo "[maintenance] baked brand: $BRAND"; \
    fi
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npx", "nuxt", "dev"]

# ==============================================================================
# Stage 4: Generate static site
# ==============================================================================
FROM base AS build
# Branding is baked at build time from a brand's TYPED config under deployment/configurations/<BRAND>
# — the generator derives the maintenance colours (:root in branding.css), logo and metadata from it,
# so a brand defines colours + logo ONCE and both the live app and the maintenance page follow.
# NOTHING is copied into the committed maintenance/ project; the overlay happens only in this
# ephemeral build stage. Pick the brand with `--build-arg BRAND=<name>` (a directory name under
# deployment/configurations/); empty = vanilla ocelot.social.
# Path 1 — MONOREPO build (docker compose, ocelot's own branded images).
ARG BRAND=""
# Bind-mount the brand configs only for THIS step (BuildKit) so no brand data lands in a build-stage
# layer/cache — the generator writes the chosen brand into /app and reads nothing else afterwards.
RUN --mount=type=bind,source=deployment/configurations,target=/brands \
    if [ -n "$BRAND" ] && { [ -f "/brands/$BRAND/branding/brand.config.ts" ] || [ -f "/brands/$BRAND/branding/brand.config.mjs" ]; }; then \
      node /brand-tools/scripts/build-maintenance-branding.ts "/brands/$BRAND/branding" /app && \
      echo "[maintenance] baked brand: $BRAND"; \
    else \
      echo "[maintenance] BRAND unset/unknown ('$BRAND') — vanilla ocelot.social"; \
    fi

# Path 2 — TWO-REPO build (a brand repo doing `FROM maintenance-build`, context = brand repo root, the
# brand in ./branding/, no BRAND arg). Only ONBUILD triggers re-run downstream, so both the bake and
# `nuxt generate` must be ONBUILD: the generator rewrites branding.css / logo assets / metadata.ts IN
# THE SOURCES, so generating before it would freeze the vanilla theme into the static output. Unlike
# webapp there is no runtime fallback — the output is static files served by nginx, and the page is
# shown precisely when the backend is unreachable, so its branding cannot be fetched at runtime.
ONBUILD COPY brandin[g]/ /brand/
ONBUILD RUN if [ -f /brand/brand.config.ts ] || [ -f /brand/brand.config.mjs ]; then \
      node /brand-tools/scripts/build-maintenance-branding.ts /brand /app; \
    else echo "[maintenance] no typed brand.config — vanilla ocelot.social"; fi
ONBUILD RUN npx nuxt generate

# ==============================================================================
# Stage 4b: Fire the ONBUILD triggers for ocelot's OWN build. They only run when `build` is used as a
# base, which for an in-repo target means a derived stage — mirrors backend's production_build.
# ==============================================================================
FROM build AS production_build

# ==============================================================================
# Stage 5: Production (static site served by nginx)
# ==============================================================================
FROM nginx:1.31.2-alpine AS production
LABEL org.label-schema.name="ocelot.social:maintenance"
LABEL org.label-schema.description="Maintenance page of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/maintenance"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"

COPY --from=production_build /app/.output/public/ /usr/share/nginx/html/
COPY maintenance/nginx/custom.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
