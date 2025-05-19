# ✅ Refactored Dockerfile: backend (ocelot.social) with ensured build output and caching

# 🧱 Base image with shared environment
FROM node:24.0.2-alpine AS base
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
WORKDIR /app

# 🔧 Dependencies stage (cached by GitHub Actions)
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

# 🔨 Build stage
FROM deps AS build
COPY . .
RUN yarn build

# 🚀 Production image (with build output included!)
FROM base AS production
COPY --from=build /app /app
COPY --from=build /app/build /app/build
CMD ["yarn", "start"]

# 🧪 Development image
FROM deps AS development
COPY . .
CMD ["yarn", "dev"]

# 🗃️ Buildx cache hint
# Use this in your GitHub Actions build step:
# docker buildx build \
#   --cache-from=type=local,src=/tmp/.buildx-cache-backend \
#   --cache-to=type=local,dest=/tmp/.buildx-cache-backend \
#   -t ocelot/backend:test \
#   -f backend/Dockerfile backend
# Also ensure `/tmp/backend.tar` is always written for downstream jobs:
# docker save ocelot/backend:test -o /tmp/backend.tar
