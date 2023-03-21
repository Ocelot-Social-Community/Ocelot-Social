#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [ -z ${CONFIGURATION} ]; then
  echo "You must provide a `CONFIGURATION` via environment variable"
  exit 1
fi
echo "Using CONFIGURATION=${CONFIGURATION}"

# configuration
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}
VALUES=${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubernetes/values.yaml
DOCKERHUB_OCELOT_TAG=${DOCKERHUB_OCELOT_TAG:-"latest"}

# upgrade with helm
helm --kubeconfig=${KUBECONFIG} upgrade ocelot \
  --values ${VALUES} \
  --set appVersion="${DOCKERHUB_OCELOT_TAG}" \
  ${SCRIPT_DIR}/../src/kubernetes/ \
  --debug \
  --timeout 10m