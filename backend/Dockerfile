##################################################################################
# BASE (Is pushed to DockerHub for rebranding) ###################################
##################################################################################
FROM node:20.12.1-alpine3.19 AS base

# ENVs
ENV DOCKER_WORKDIR="/app"
## SET NODE_ENV
ENV NODE_ENV="production"
## App relevant Envs
ENV PORT="4000"

# Labels
LABEL org.label-schema.name="ocelot.social:backend"
LABEL org.label-schema.description="Backend of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/backend"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"

# Install Additional Software
## install: git
RUN apk --no-cache add git python3 make g++

# Settings
## Expose Container Port
EXPOSE ${PORT}

## Workdir
RUN mkdir -p ${DOCKER_WORKDIR}
WORKDIR ${DOCKER_WORKDIR}

##################################################################################
# DEVELOPMENT (Connected to the local environment, to reload on demand) ##########
##################################################################################
FROM base AS development

# We don't need to copy or build anything since we gonna bind to the
# local filesystem which will need a rebuild anyway

# Run command
# (for development we need to execute yarn install since the
#  node_modules are on another volume and need updating)
CMD /bin/sh -c "yarn install && yarn run dev"

##################################################################################
# CODE (Does contain all code files and is pushed to DockerHub for rebranding) ###
##################################################################################
FROM base AS code

# copy everything, but do not build.
COPY . .

##################################################################################
# BUILD (Does contain all files and the compilate and is therefore bloated) ######
##################################################################################
FROM code AS build

# yarn install
RUN yarn install --production=false --frozen-lockfile --non-interactive
# yarn build
RUN /bin/sh -c "yarn run build"

##################################################################################
# TEST ###########################################################################
##################################################################################
FROM build AS test

# Run command
CMD /bin/sh -c "yarn run dev"

##################################################################################
# PRODUCTION (Does contain only "binary"- and static-files to reduce image size) #
##################################################################################
FROM base AS production

# Copy "binary"-files from build image
COPY --from=build ${DOCKER_WORKDIR}/build ./build
COPY --from=build ${DOCKER_WORKDIR}/node_modules ./node_modules
# Copy static files
# TODO - externalize the uploads so we can copy the whole folder
COPY --from=build ${DOCKER_WORKDIR}/public/img/ ./public/img/
COPY --from=build ${DOCKER_WORKDIR}/public/providers.json ./public/providers.json
# Copy package.json for script definitions (lock file should not be needed)
COPY --from=build ${DOCKER_WORKDIR}/package.json ./package.json

# Run command
CMD /bin/sh -c "yarn run start"
