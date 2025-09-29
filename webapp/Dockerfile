FROM node:24.9.0-alpine AS styleguide
RUN apk --no-cache add git python3 make g++
RUN mkdir -p /app
WORKDIR /app
COPY styleguide .
RUN yarn install --production=false --frozen-lockfile --non-interactive
RUN yarn run build

FROM node:20.12.1-alpine AS base
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
COPY --from=styleguide ./app/ /styleguide/
CMD ["/bin/bash", "-c", "yarn run start"]

FROM base AS development
CMD ["/bin/bash", "-c", "yarn install && yarn run dev"]

FROM base AS build
COPY webapp/ .
ONBUILD COPY webapp/branding .
ONBUILD RUN tools/merge-locales.sh
ONBUILD RUN yarn install --production=false --frozen-lockfile --non-interactive
ONBUILD RUN yarn run build
ONBUILD RUN mkdir /build
ONBUILD RUN cp -r ./.nuxt /build
ONBUILD RUN cp -r ./nuxt.config.js /build
# Copy static files
# TODO - this seems not be needed anymore for the new rebranding
# TODO - this should be one Folder containign all stuff needed to be copied
ONBUILD RUN cp -r ./config/ /build
ONBUILD RUN cp -r ./constants /build
ONBUILD RUN cp -r ./static /build
ONBUILD RUN cp -r ./locales /build
ONBUILD RUN cp -r ./package.json ./yarn.lock /build
ONBUILD RUN cd /build && yarn install --production=true --frozen-lockfile --non-interactive

FROM base AS test_build
ENV NODE_ENV=test
COPY webapp/. .
RUN tools/merge-locales.sh
RUN yarn install --production=false --frozen-lockfile --non-interactive
RUN yarn run build
RUN mkdir /build
RUN cp -r ./.nuxt /build
RUN cp -r ./nuxt.config.js /build
RUN cp -r ./config/ /build
RUN cp -r ./constants /build
RUN cp -r ./static /build
RUN cp -r ./locales /build
RUN cp -r ./package.json ./yarn.lock /build
RUN cd /build && yarn install --frozen-lockfile --non-interactive

FROM test_build AS test
CMD ["/bin/bash", "-c", "yarn run dev"]

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
