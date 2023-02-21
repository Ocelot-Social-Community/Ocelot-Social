#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
CONFIGURATION=${CONFIGURATION:-"example"}
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}
VALUES=${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubernetes/values.yaml

# upgrade with helm
helm --kubeconfig=${KUBECONFIG} upgrade ocelot --values ${VALUES} ${SCRIPT_DIR}/../src/kubernetes/ --debug --timeout 10m