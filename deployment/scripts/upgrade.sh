#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
CONFIGURATION=${CONFIGURATION:-"example"}
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yml}
VALUES=${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubenertes/values.yaml

# constants
CHART=${SCRIPT_DIR}/../src/kubernetes/Chart.yaml

# upgrade with helm
helm --kubeconfig=... upgrade ocelot --values ${VALUES} ${CHART}