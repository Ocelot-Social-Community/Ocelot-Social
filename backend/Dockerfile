# syntax=docker/dockerfile:1

# Build the shared branding package (tsc -> dist). Placed at /packages/branding in `base` so the
# backend's `file:../packages/branding` dependency resolves. Requires the repo-root build context
# (see docker-compose*.yml / .github/workflows — backend now builds with `context: .`).
FROM node:26.6.0-alpine AS branding-library
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
#                        `build` only, which is where the ONBUILD bake runs.
#   • branding-runtime — what the RUNNING backend imports (dist/ + nanotar/tslib). devDeps pruned.
# `production` derives FROM base and copies only /build, so it inherits the runtime half alone.
FROM branding-library AS branding-tools

FROM branding-library AS branding-runtime
RUN npm prune --omit=dev

FROM node:26.6.0-alpine AS base
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
COPY --from=branding-runtime ./app/ /packages/branding/
# Brand archives (`<id>.tar.gz`) + the default marker (DEFAULT) live in ./deployment/configurations —
# the SAME path they have in a repo checkout, which is why no env var is needed: the code default
# covers both (see @ocelot-social/branding discover.DEFAULT_ROOTS). A branding build bakes them there
# (see ONBUILD); vanilla leaves the directory absent (→ framework defaults). Ops override the search
# path with $OCELOT_BRANDING_ASSETS_DIR (`:`-separated, e.g. a mounted volume of uploaded archives),
# or pin a brand with $OCELOT_ACTIVE_BRANDING.
CMD ["/bin/bash", "-c", "yarn run start"]

FROM base AS development
CMD ["/bin/sh", "-c", "yarn install && yarn run dev"]

FROM base AS build
# The brand-archive builder, used by the ONBUILD bake below. Lives ONLY in this stage (published as
# backend-build) — the runtime image is FROM base + COPY /build and never inherits it.
COPY --from=branding-tools ./app/ /brand-tools/
# Repo-root build context now (for /packages/branding): copy only the backend subtree to /app.
COPY backend/ .
# Optional per-brand overlays (code/seed data not yet ported to the runtime archive). The `[g]` glob
# makes them optional so the SAME image serves two contexts: a downstream brand build (`FROM
# backend-build`, context = brand repo root → `./branding/` present → copied) and ocelot's own
# vanilla self-build (`FROM build AS test`, context = repo root → no `./branding/` → skipped; the
# committed src/ defaults stay). Same idiom as `brandin[g]/` below and the e-mail overlays on master.
ONBUILD COPY brandin[g]/middlewares/ src/middleware/branding/
ONBUILD COPY brandin[g]/data/ src/db/data
# Runtime branding: copy the brand UNFLATTENED into /brand and bake its archive (+ DEFAULT marker) into
# ./deployment/configurations — the discovery root, named exactly as in a repo checkout so the running
# code finds it without being told where to look. At startup src/branding/bootstrap.ts injects this
# brand's config AND overlays the archive's e-mail templates/locales onto the defaults — no per-brand
# rebuild. Served brand files (logos, fonts, css, badge SVGs) are NOT copied anywhere: the webapp
# reads them straight from the archive at /branding/<id>/…. The overlay copies above still bring in
# not-yet-ported content (brand middlewares + seed data — code/data, not config). A vanilla build (no
# brand.config) skips this and stays vanilla.
#
# Flat inside the root (`<id>.tar.gz` + `<id>-<version>.tar.gz` + DEFAULT), not nested per brand: an
# image holds exactly ONE brand, discovery is recursive either way, and the DEFAULT marker is read from
# the root itself. A checkout nests (`<brand>/branding/dist/`) because it holds many.
ONBUILD COPY brandin[g]/ /brand/
ONBUILD RUN if ls /brand/brand.config.* >/dev/null 2>&1; then \
      node /brand-tools/scripts/build-brand-archive.ts /brand ./deployment/configurations --default; \
    else echo "[branding] no typed brand.config — runtime archive skipped (vanilla)"; fi
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
ONBUILD RUN yarn run build
ONBUILD RUN mkdir /build && \
    cp -r ./build ./package.json ./yarn.lock /build && \
    if [ -d ./deployment ]; then cp -r ./deployment /build/deployment; fi
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --production=true --frozen-lockfile --non-interactive --cache-folder /yarn-cache

FROM build AS test
# required for the migrations
# ONBUILD RUN cp -r ./src /src
CMD ["/bin/bash", "-c", "yarn run dev"]

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
