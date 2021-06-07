ARG APP_IMAGE=ocelotsocialnetwork/maintenance
ARG APP_IMAGE_TAG_BASE=latest-base
ARG APP_IMAGE_TAG_CODE=latest-code
ARG APP_IMAGE_BASE=${APP_IMAGE}:${APP_IMAGE_TAG_BASE}
ARG APP_IMAGE_CODE=${APP_IMAGE}:${APP_IMAGE_TAG_CODE}

##################################################################################
# CODE (branded) #################################################################
##################################################################################
FROM $APP_IMAGE_CODE as code

# copy public constants into the Docker image to brand it
COPY branding/static/ static/
COPY branding/constants/ constants/
COPY branding/locales/ locales/

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

