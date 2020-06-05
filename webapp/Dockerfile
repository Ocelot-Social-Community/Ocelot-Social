FROM node:lts-alpine as base

EXPOSE 3000
CMD ["yarn", "run", "start"]

# Expose the app port
ARG BUILD_COMMIT
ENV BUILD_COMMIT=$BUILD_COMMIT
ARG WORKDIR=/webapp
RUN mkdir -p $WORKDIR
WORKDIR $WORKDIR

# See: https://github.com/nodejs/docker-node/pull/367#issuecomment-430807898
RUN apk --no-cache add git

COPY package.json yarn.lock ./
COPY .env.template .env


FROM base as build-and-test
RUN yarn install --production=false --frozen-lockfile --non-interactive
COPY . .
RUN NODE_ENV=production yarn run build

FROM base as production
RUN yarn install --production=true --frozen-lockfile --non-interactive --no-cache
COPY --from=build-and-test ./webapp/.nuxt ./.nuxt
COPY --from=build-and-test ./webapp/static ./static
COPY nuxt.config.js .
COPY locales locales
