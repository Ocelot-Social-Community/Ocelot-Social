##################################################################################
# BASE ###########################################################################
##################################################################################
FROM node:12.19.0-alpine3.10 as base

# ENVs (available in production aswell, can be overwritten by commandline or env file)
## DOCKER_WORKDIR would be a classical ARG, but that is not multi layer persistent - shame
ENV DOCKER_WORKDIR="/app"
## We Cannot do `$(date -u +'%Y-%m-%dT%H:%M:%SZ')` here so we use unix timestamp=0
ENV BUILD_DATE="1970-01-01T00:00:00.00Z"
## We cannot do $(yarn run version) here so we default to 0.0.0
## TODO: Missing Build number - do that once we have a CI which actually generates it
ENV BUILD_VERSION="0.0.0"
## We cannot do `$(git rev-parse --short HEAD)` here so we default to 0000000
ENV BUILD_COMMIT="0000000"
## SET NODE_ENV
ENV NODE_ENV=production
## App Envs
ENV PORT="4000"

# Labels
LABEL org.label-schema.build-date="${BUILD_DATE}"
LABEL org.label-schema.name="ocelot.social:backend"
LABEL org.label-schema.description="Backend of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/backend"
LABEL org.label-schema.vcs-ref="${BUILD_COMMIT}"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.version="${VERSION}"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"

# Settings
EXPOSE ${PORT}
WORKDIR ${DOCKER_WORKDIR}

## Make Workdir
RUN mkdir -p ${DOCKER_WORKDIR}
## Additional Software
RUN apk --no-cache add git  
## Copy package.json, yarn.lock, .env
COPY package.json yarn.lock ./
COPY .env.template .env

# Run command
CMD ["yarn", "run", "start"]

##################################################################################
# DEVELOPMENT (Connected to the local environment, to reload on demand) ##########
##################################################################################
FROM base as development

# We don't need to copy or build anything since we gonna bind to the
# local filesystem which will need a rebuild anyway

# Define Volume for workdir folder on development
# VOLUME ${DOCKER_WORKDIR}

##################################################################################
# BUILD (Does contain all files and is therefore bloated) ########################
##################################################################################
FROM base as build

# Copy everything
COPY . .
# yarn install
RUN yarn install --production=false --frozen-lockfile --non-interactive
# yarn build
RUN yarn run build

##################################################################################
# PRODUCTION (Does contain only "binary"- and static-files to reduce image size) #
##################################################################################
FROM base as production

# Copy "binary"-files from build image
COPY --from=build ${DOCKER_WORKDIR}/dist ./dist
# Copy static files
# TODO - externalize the uploads so we can copy the whole folder
COPY ./public/img/ ./public/img/
COPY ./public/providers.json ./public/providers.json
# yarn install
RUN yarn install --production=true --frozen-lockfile --non-interactive --no-cache