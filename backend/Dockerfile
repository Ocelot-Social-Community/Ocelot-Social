FROM node:24.7.0-alpine AS base
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
CMD ["/bin/bash", "-c", "yarn run start"]

FROM base AS development
CMD ["/bin/sh", "-c", "yarn install && yarn run dev"]

FROM base AS build
COPY . .
ONBUILD COPY ./branding/constants/ src/config/tmp
# copy categories to brand them (use yarn prod:db:data:categories)
ONBUILD COPY ./branding/constants/ src/constants/
ONBUILD RUN tools/replace-constants.sh
ONBUILD COPY ./branding/email/ src/middleware/helpers/email/
ONBUILD COPY ./branding/middlewares/ src/middleware/branding/
ONBUILD COPY ./branding/data/ src/db/data
ONBUILD COPY ./branding/public/ public/
ONBUILD RUN yarn install --production=false --frozen-lockfile --non-interactive
ONBUILD RUN yarn run build
ONBUILD RUN mkdir /build
ONBUILD RUN cp -r ./build /build
ONBUILD RUN cp -r ./public /build
ONBUILD RUN cp -r ./package.json yarn.lock /build
ONBUILD RUN cd /build && yarn install --production=true --frozen-lockfile --non-interactive

FROM build AS test
# required for the migrations
# ONBUILD RUN cp -r ./src /src
CMD ["/bin/bash", "-c", "yarn run dev"]

FROM build AS production_build

FROM base AS production
COPY --from=production_build /build .
