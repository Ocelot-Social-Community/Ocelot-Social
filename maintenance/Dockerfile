# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Build UI library
# ==============================================================================
FROM node:25.8.1-alpine AS ui-library
RUN apk --no-cache add git python3 make g++
WORKDIR /packages/ui
COPY packages/ui/ .
RUN npm ci
RUN npm run build

# ==============================================================================
# Stage 2: Install dependencies and build
# ==============================================================================
FROM node:25.8.1-alpine AS build
RUN apk --no-cache add git python3 make g++
WORKDIR /app
COPY --from=ui-library /packages/ui/ /packages/ui/
COPY maintenance/package.json maintenance/package-lock.json ./
RUN npm ci
COPY maintenance/ .
# Branding: reuse existing branding repo structure
# Static assets (logo, favicon) — Nuxt 4 uses public/ instead of static/
ONBUILD COPY brandin[g]/static/ /app/public/
# Constants — copy JS to TS (Nuxt 4 TypeScript)
ONBUILD COPY brandin[g]/constants/metadata.j[s] /app/app/constants/metadata.ts
ONBUILD COPY brandin[g]/constants/emails.j[s] /app/app/constants/emails.ts
# Locales — merge branding translations into defaults (same mechanism as webapp)
ONBUILD COPY brandin[g]/locales/*.jso[n] /app/locales/tmp/
ONBUILD RUN if [ -d locales/tmp ]; then apk add --no-cache jq && tools/merge-locales.sh; fi
RUN npx nuxt generate

# ==============================================================================
# Stage 3: Development (hot-reload with mounted sources)
# ==============================================================================
FROM build AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npx", "nuxt", "dev"]

# ==============================================================================
# Stage 4: Production (static site served by nginx)
# ==============================================================================
FROM nginx:1.29.6-alpine AS production
LABEL org.label-schema.name="ocelot.social:maintenance"
LABEL org.label-schema.description="Maintenance page of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/maintenance"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"

COPY --from=build /app/.output/public/ /usr/share/nginx/html/
COPY maintenance/nginx/custom.conf /etc/nginx/conf.d/default.conf
