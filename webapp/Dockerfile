# ✅ Refactored Dockerfile: webapp (ocelot.social)

# 🧱 Base image with common tooling
FROM node:20.12.1-alpine AS base
LABEL org.label-schema.name="ocelot.social:webapp"
LABEL org.label-schema.description="Frontend of the Social Network Software ocelot.social"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL maintainer="devops@ocelot.social"
RUN apk --no-cache add git python3 make g++ bash jq
WORKDIR /app
ENV NODE_ENV=production

# 🔧 Dependencies
FROM base AS deps
COPY package.json yarn.lock .
RUN yarn install --frozen-lockfile --non-interactive

# 🔨 Build
FROM deps AS build
COPY . .
RUN tools/merge-locales.sh
RUN yarn run build

# 🚀 Production
FROM base AS production
COPY --from=build /app /app
CMD ["yarn", "start"]

# 🧪 Development
FROM deps AS development
COPY . .
CMD ["yarn", "dev"]
