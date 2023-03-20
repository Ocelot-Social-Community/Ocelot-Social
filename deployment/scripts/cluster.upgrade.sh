#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
CONFIGURATION=${CONFIGURATION:-"example"}
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}
VALUES=${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubernetes/values.
DOCKERHUB_OCELOT_TAG=${DOCKERHUB_OCELOT_TAG:-"latest"}

# upgrade with helm
helm --kubeconfig=${KUBECONFIG} upgrade ocelot \
  --values ${VALUES} \
  --set appVersion="${DOCKERHUB_OCELOT_TAG}"
  ${SCRIPT_DIR}/../src/kubernetes/ \
  --timeout 10m