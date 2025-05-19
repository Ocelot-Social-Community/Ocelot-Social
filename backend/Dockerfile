# ✅ Refactored Dockerfile: backend (ocelot.social)

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

# 🔧 Dependencies stage
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

# 🔨 Build stage
FROM deps AS build
COPY . .
RUN yarn build

# 🚀 Production image
FROM base AS production
COPY --from=build /app /app
CMD ["yarn", "start"]

# 🧪 Development image
FROM deps AS development
COPY . .
CMD ["yarn", "dev"]
