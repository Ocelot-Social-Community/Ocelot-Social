#!/bin/bash

# for a branded version you should pass the following env variables:
# DOCKERHUB_ORGANISATION - your dockerhub organisation
# OCELOT_VERSION - specify the specific tag to build upon e.g. 2.4.0-300
# DOCKERHUB_USERNAME - your dockerhub username
# DOCKERHUB_TOKEN - your dockerhub access token

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
DOCKERHUB_ORGANISATION=${DOCKERHUB_ORGANISATION:-"ocelotsocialnetwork"}
OCELOT_VERSION=${OCELOT_VERSION:-$(node -p -e "require('${SCRIPT_DIR}/../../package.json').version")}
OCELOT_GITHUB_RUN_NUMBER=${OCELOT_GITHUB_RUN_NUMBER:-master}
OCELOT_VERSION_BUILD=${OCELOT_VERSION_BUILD:-${OCELOT_VERSION}-${OCELOT_GITHUB_RUN_NUMBER}}
BRANDED_VERSION=${BRANDED_VERSION:-${GITHUB_RUN_NUMBER:-"local"}}
BUILD_VERSION_BASE=${BRANDED_VERSION}-ocelot.social${OCELOT_VERSION}
BUILD_VERSION=${BRANDED_VERSION}-ocelot.social${OCELOT_VERSION_BUILD}

# login to dockerhub
echo "${DOCKERHUB_TOKEN}" | docker login -u "${DOCKERHUB_USERNAME}" --password-stdin

# push backend images
docker push ${DOCKERHUB_ORGANISATION}/backend-branded:latest
docker push ${DOCKERHUB_ORGANISATION}/backend-branded:${OCELOT_VERSION}
docker push ${DOCKERHUB_ORGANISATION}/backend-branded:${OCELOT_VERSION_BUILD}
docker push ${DOCKERHUB_ORGANISATION}/backend-branded:${BUILD_VERSION_BASE}
docker push ${DOCKERHUB_ORGANISATION}/backend-branded:${BUILD_VERSION}

# push webapp images
docker push ${DOCKERHUB_ORGANISATION}/webapp-branded:latest
docker push ${DOCKERHUB_ORGANISATION}/webapp-branded:${OCELOT_VERSION}
docker push ${DOCKERHUB_ORGANISATION}/webapp-branded:${OCELOT_VERSION_BUILD}
docker push ${DOCKERHUB_ORGANISATION}/webapp-branded:${BUILD_VERSION_BASE}
docker push ${DOCKERHUB_ORGANISATION}/webapp-branded:${BUILD_VERSION}

# push maintenance images
docker push ${DOCKERHUB_ORGANISATION}/maintenance-branded:latest
docker push ${DOCKERHUB_ORGANISATION}/maintenance-branded:${OCELOT_VERSION}
docker push ${DOCKERHUB_ORGANISATION}/maintenance-branded:${OCELOT_VERSION_BUILD}
docker push ${DOCKERHUB_ORGANISATION}/maintenance-branded:${BUILD_VERSION_BASE}
docker push ${DOCKERHUB_ORGANISATION}/maintenance-branded:${BUILD_VERSION}