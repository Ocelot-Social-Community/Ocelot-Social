#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
CONFIGURATION=${CONFIGURATION:-"example"}
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}

# clean & seed
kubectl --kubeconfig=${KUBECONFIG} -n default exec -it $(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-backend | awk '{ print $1 }') -- /bin/sh -c "node --experimental-repl-await dist/db/clean.js && node --experimental-repl-await dist/db/seed.js"