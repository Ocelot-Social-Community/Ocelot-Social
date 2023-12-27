ARG APP_IMAGE=ocelotsocialnetwork/maintenance
ARG APP_IMAGE_TAG_BASE=latest-base
ARG APP_IMAGE_TAG_CODE=latest-code
ARG APP_IMAGE_BASE=${APP_IMAGE}:${APP_IMAGE_TAG_BASE}
ARG APP_IMAGE_CODE=${APP_IMAGE}:${APP_IMAGE_TAG_CODE}

##################################################################################
# CODE (branded) #################################################################
##################################################################################
FROM $APP_IMAGE_CODE as code

ARG CONFIGURATION=example

# copy public constants into the Docker image to brand it
COPY configurations/${CONFIGURATION}/branding/static/ static/
# COPY configurations/${CONFIGURATION}/branding/constants/ constants/
# RUN /bin/sh -c 'cd constants && for f in *.ts; do mv -- "$f" "${f%.ts}.js"; done'
COPY configurations/${CONFIGURATION}/branding/config/ branding/
RUN /bin/sh -c 'cd branding && for f in *.ts; do mv -- "$f" "${f%.ts}.js"; done'

# locales
COPY configurations/${CONFIGURATION}/branding/locales/*.json locales/tmp/
COPY src/tools/ tools/
RUN apk add --no-cache bash jq
RUN tools/merge-locales.sh

##################################################################################
# BUILD ##########################################################################
##################################################################################
FROM code as build

# yarn install
## unnicely done in $APP_IMAGE_CODE at the moment, see main repo
# RUN yarn install --production=false --frozen-lockfile --non-interactive
# yarn generate
RUN yarn run generate

##################################################################################
# BRANDED ### TODO # TODO # TODO # TODO # TODO # TODO # TODO # TODO # TODO ####
##################################################################################
# FROM $APP_IMAGE_BASE as branded
FROM nginx:alpine as branded

COPY --from=build ./app/dist/ /usr/share/nginx/html/
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=code ./app/maintenance/nginx/custom.conf /etc/nginx/conf.d/
