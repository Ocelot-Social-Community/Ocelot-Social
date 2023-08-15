#!/bin/bash

# for a branded version you should pass the following env variables:
# CONFIGURATION - your configuration folder name
# DOCKERHUB_ORGANISATION - your dockerhub organisation
# OCELOT_VERSION - specify the specific tag to build upon e.g. 2.4.0-300

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [ -z ${CONFIGURATION} ]; then
  echo "You must provide a `CONFIGURATION` via environment variable"
  exit 1
fi
echo "Using CONFIGURATION=${CONFIGURATION}"

# check DOCKERHUB_BRAND_VARRIANT
if [ -z ${DOCKERHUB_BRAND_VARRIANT} ]; then
  echo "You must provide a `DOCKERHUB_BRAND_VARRIANT` via environment variable"
  exit 1
fi
echo "Using DOCKERHUB_BRAND_VARRIANT=${DOCKERHUB_BRAND_VARRIANT}"

# configuration
DOCKERHUB_ORGANISATION=${DOCKERHUB_ORGANISATION:-"ocelotsocialnetwork"}
OCELOT_VERSION=${OCELOT_VERSION:-$(node -p -e "require('${SCRIPT_DIR}/../../package.json').version")}
OCELOT_GITHUB_RUN_NUMBER=${OCELOT_GITHUB_RUN_NUMBER:-master}
OCELOT_VERSION_BUILD=${OCELOT_VERSION_BUILD:-${OCELOT_VERSION}-${OCELOT_GITHUB_RUN_NUMBER}}
BRANDED_VERSION=${BRANDED_VERSION:-${GITHUB_RUN_NUMBER:-"local"}}
BUILD_DATE=${BUILD_DATE:-$(date -u +'%Y-%m-%dT%H:%M:%SZ')}
BUILD_VERSION_BASE=${BRANDED_VERSION}-ocelot.social${OCELOT_VERSION}
BUILD_VERSION=${BRANDED_VERSION}-ocelot.social${OCELOT_VERSION_BUILD}
BUILD_COMMIT=${GITHUB_SHA:-"0000000"}

# backend
docker build --target branded \
    -t "${DOCKERHUB_ORGANISATION}/backend-${DOCKERHUB_BRAND_VARRIANT}:latest" \
    -t "${DOCKERHUB_ORGANISATION}/backend-${DOCKERHUB_BRAND_VARRIANT}:${OCELOT_VERSION}" \
    -t "${DOCKERHUB_ORGANISATION}/backend-${DOCKERHUB_BRAND_VARRIANT}:${OCELOT_VERSION_BUILD}" \
    -t "${DOCKERHUB_ORGANISATION}/backend-${DOCKERHUB_BRAND_VARRIANT}:${BUILD_VERSION_BASE}" \
    -t "${DOCKERHUB_ORGANISATION}/backend-${DOCKERHUB_BRAND_VARRIANT}:${BUILD_VERSION}" \
    -f "${SCRIPT_DIR}/../src/docker/backend.Dockerfile" \
    --build-arg "CONFIGURATION=${CONFIGURATION}" \
    --build-arg "APP_IMAGE_TAG_CODE=${OCELOT_VERSION}-code" \
    --build-arg "APP_IMAGE_TAG_BASE=${OCELOT_VERSION}-base" \
    "${SCRIPT_DIR}/../."

# webapp
docker build --target branded \
    -t "${DOCKERHUB_ORGANISATION}/webapp-${DOCKERHUB_BRAND_VARRIANT}:latest" \
    -t "${DOCKERHUB_ORGANISATION}/webapp-${DOCKERHUB_BRAND_VARRIANT}:${OCELOT_VERSION}" \
    -t "${DOCKERHUB_ORGANISATION}/webapp-${DOCKERHUB_BRAND_VARRIANT}:${OCELOT_VERSION_BUILD}" \
    -t "${DOCKERHUB_ORGANISATION}/webapp-${DOCKERHUB_BRAND_VARRIANT}:${BUILD_VERSION_BASE}" \
    -t "${DOCKERHUB_ORGANISATION}/webapp-${DOCKERHUB_BRAND_VARRIANT}:${BUILD_VERSION}" \
    -f "${SCRIPT_DIR}/../src/docker/webapp.Dockerfile" \
    --build-arg "CONFIGURATION=${CONFIGURATION}" \
    --build-arg "APP_IMAGE_TAG_CODE=${OCELOT_VERSION}-code" \
    --build-arg "APP_IMAGE_TAG_BASE=${OCELOT_VERSION}-base" \
    "${SCRIPT_DIR}/../."

# mainteance
docker build --target branded \
    -t "${DOCKERHUB_ORGANISATION}/maintenance-${DOCKERHUB_BRAND_VARRIANT}:latest" \
    -t "${DOCKERHUB_ORGANISATION}/maintenance-${DOCKERHUB_BRAND_VARRIANT}:${OCELOT_VERSION}" \
    -t "${DOCKERHUB_ORGANISATION}/maintenance-${DOCKERHUB_BRAND_VARRIANT}:${OCELOT_VERSION_BUILD}" \
    -t "${DOCKERHUB_ORGANISATION}/maintenance-${DOCKERHUB_BRAND_VARRIANT}:${BUILD_VERSION_BASE}" \
    -t "${DOCKERHUB_ORGANISATION}/maintenance-${DOCKERHUB_BRAND_VARRIANT}:${BUILD_VERSION}" \
    -f "${SCRIPT_DIR}/../src/docker/maintenance.Dockerfile" \
    --build-arg "CONFIGURATION=${CONFIGURATION}" \
    --build-arg "APP_IMAGE_TAG_CODE=${OCELOT_VERSION}-code" \
    --build-arg "APP_IMAGE_TAG_BASE=${OCELOT_VERSION}-base" \
    "${SCRIPT_DIR}/../."
