#!/bin/bash

# time stamp
printf "Neo4J bash :\n  "
date

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [[ -z "$CONFIGURATION" ]]; then
  echo "!!! You must provide a CONFIGURATION via environment variable !!!"
  exit 1
fi

printf "  Cluster:  %s\n" $CONFIGURATION

# configuration
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}

kubectl --kubeconfig=${KUBECONFIG} -n default exec -it $(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-backend | awk '{ print $1 }') -- /bin/sh