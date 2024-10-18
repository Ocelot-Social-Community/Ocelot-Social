##################################################################################
# BASE (Is pushed to DockerHub for rebranding) ###################################
##################################################################################
FROM node:20.12.1-alpine3.19 AS base

ENV DOCKER_WORKDIR="/app"
ENV NODE_ENV="production"
ENV PORT="3000"

# Labels
LABEL org.label-schema.name="ocelot.social:webapp"
LABEL org.label-schema.description="Web Frontend of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/webapp"
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
RUN yarn run build

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

# TODO - do all copying with one COPY command to have one layer
# Copy "binary"-files from build image
COPY --from=build ${DOCKER_WORKDIR}/.nuxt ./.nuxt
COPY --from=build ${DOCKER_WORKDIR}/node_modules ./node_modules
COPY --from=build ${DOCKER_WORKDIR}/nuxt.config.js ./nuxt.config.js
# Copy static files
# TODO - this seems not be needed anymore for the new rebranding
# TODO - this should be one Folder containign all stuff needed to be copied
COPY --from=build ${DOCKER_WORKDIR}/config/ ./config/
COPY --from=build ${DOCKER_WORKDIR}/constants ./constants
COPY --from=build ${DOCKER_WORKDIR}/static ./static
COPY --from=build ${DOCKER_WORKDIR}/locales ./locales
# Copy package.json for script definitions (lock file should not be needed)
COPY --from=build ${DOCKER_WORKDIR}/package.json ./package.json

# Run command
CMD /bin/sh -c "yarn run start"

##################################################################################
# maintenance-build
##################################################################################
FROM base AS maintenance-build

COPY package.json yarn.lock ./
# yarn install
RUN yarn install --production=false --frozen-lockfile --non-interactive

COPY assets assets
# COPY components/_new/generic/ components/_new/generic
COPY components/LocaleSwitch/ components/LocaleSwitch
COPY components/Dropdown.vue components/Dropdown.vue
# COPY components/Logo/ components/Logo
COPY layouts/blank.vue layouts/blank.vue
COPY locales locales
COPY mixins mixins
COPY plugins/i18n.js plugins/v-tooltip.js plugins/styleguide.js plugins/
COPY static static
COPY constants constants
COPY nuxt.config.js nuxt.config.js
COPY config/ config/

# this is needed in rebranding
COPY maintenance/nginx maintenance/nginx
# this will also ovewrite the existing package.json
COPY maintenance/source ./

RUN yarn run generate

##################################################################################
# maintenance-production
##################################################################################
FROM nginx:alpine AS maintenance

LABEL org.label-schema.name="ocelot.social:maintenance"
LABEL org.label-schema.description="Maintenance page of the Social Network Software ocelot.social"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/webapp"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"


COPY --from=maintenance-build ./app/dist/ /usr/share/nginx/html/
RUN rm /etc/nginx/conf.d/default.conf
COPY maintenance/nginx/custom.conf /etc/nginx/conf.d/
