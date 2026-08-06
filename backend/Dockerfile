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
# MANIFEST FIRST, sources second — the layer order is the whole point. The dependency install below
# may only depend on package.json + yarn.lock, so it survives every commit that touches src/ only.
# Copying the subtree first (as this did) invalidated the install on ANY backend change: the yarn
# CACHE mount saved the downloads, but node_modules was still relinked and the native modules
# (python3/make/g++ sit in `base` for exactly them) recompiled on every push.
COPY backend/package.json backend/yarn.lock ./
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
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
# No dev install here any more — the `build` stage above already did it, before the sources landed.
# Nothing an ONBUILD trigger copies can change the dependency set: the overlays go to
# src/middleware/branding/, src/db/data and /brand, never to /app/package.json or yarn.lock. Re-running
# a frozen-lockfile install against a warm node_modules only cost time, in this repo's own build AND in
# every downstream brand build.
ONBUILD RUN yarn run build
ONBUILD RUN mkdir /build && \
    cp -r ./build ./package.json ./yarn.lock /build && \
    if [ -d ./deployment ]; then cp -r ./deployment /build/deployment; fi
ONBUILD RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    cd /build && yarn install --production=true --frozen-lockfile --non-interactive --cache-folder /yarn-cache

# Deliberately NOT `FROM build`: the test image runs `yarn dev` → `nodemon --exec tsx src/index.ts`,
# straight off the sources. Everything `build` adds on top — `yarn run build` (tsc), the /build copy and
# the `--production=true` install into it — is never read by this image, and it is not cheap: 107 s for
# the production install and 10 s for tsc, on a build that the e2e matrix then downloads 40 times.
# The db migrations do not need it either; the workflow calls `yarn db:migrate`, which compiles the TS
# migrations on the fly (`--compiler ts:./src/db/compiler.ts`) — `prod:migrate` is the compiled variant
# and is not used here.
#
# It cannot share a parent with `build` to avoid the duplicated three lines below, and that is a
# property of ONBUILD rather than an oversight: a trigger fires ONCE, when the stage carrying it is used
# as a base, and is NOT re-exported to the resulting image. Putting the branding triggers on a shared
# parent would fire them here — against ocelot's own context, where `branding/` does not exist, so they
# are no-ops — and `backend-build` would then reach the brand repos WITHOUT them. The brand's
# middlewares, seed data and archive would silently not be copied and the build would still go green.
# Hence: `build` keeps the untouched trigger chain for downstream, `test` gets its own lean path.
FROM base AS test
COPY backend/package.json backend/yarn.lock ./
RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --production=false --frozen-lockfile --non-interactive --cache-folder /yarn-cache
COPY backend/ .
CMD ["/bin/bash", "-c", "yarn run dev"]

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
