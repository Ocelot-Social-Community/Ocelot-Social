ARG APP_IMAGE=ocelotsocialnetwork/webapp
ARG APP_IMAGE_TAG_BASE=latest-base
ARG APP_IMAGE_TAG_CODE=latest-code
ARG APP_IMAGE_BASE=${APP_IMAGE}:${APP_IMAGE_TAG_BASE}
ARG APP_IMAGE_CODE=${APP_IMAGE}:${APP_IMAGE_TAG_CODE}

##################################################################################
# CODE (branded) #################################################################
##################################################################################
FROM $APP_IMAGE_CODE as code

# copy public constants into the Docker image to brand it
COPY tools/ tools/
COPY branding/static/ static/
COPY branding/constants/ constants/
COPY branding/locales/html/ locales/html/
# COPY branding/locales/index.js locales/index.js
COPY branding/locales/*.json locales/tmp/
COPY branding/assets/styles/imports/ assets/styles/imports/

RUN apk add --no-cache bash jq

RUN tools/merge-locales.sh

##################################################################################
# BUILD ##########################################################################
##################################################################################
FROM code as build

# yarn install
RUN yarn install --production=false --frozen-lockfile --non-interactive
# yarn build
RUN yarn run build

##################################################################################
# BRANDED (Does contain only "binary"- and static-files to reduce image size) ####
##################################################################################
FROM $APP_IMAGE_BASE as branded

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
COPY --from=build ${DOCKER_WORKDIR}/assets/styles/imports ./assets/styles/imports
# Copy package.json for script definitions (lock file should not be needed)
COPY --from=build ${DOCKER_WORKDIR}/package.json ./package.json

# Run command
CMD /bin/sh -c "yarn run start"
