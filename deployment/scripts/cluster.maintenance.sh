#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [[ -z "$CONFIGURATION" ]]; then
  echo "You must provide a `CONFIGURATION` via environment variable"
  exit 1
fi
echo "Using CONFIGURATION=${CONFIGURATION}"

# configuration
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}

case $1 in
    on)
        echo "Network maintenance:  on"
        kubectl --kubeconfig=${KUBECONFIG} patch ingress ingress-ocelot-webapp --type merge --patch-file ${SCRIPT_DIR}/../src/kubernetes/patches/patch.ingress.maintenance.on.yaml
    ;;
    off)
        echo "Network maintenance:  off"
        kubectl --kubeconfig=${KUBECONFIG} patch ingress ingress-ocelot-webapp --type merge --patch-file ${SCRIPT_DIR}/../src/kubernetes/patches/patch.ingress.maintenance.off.yaml
    ;;
    *)
        echo -e "Run this script with first argument either 'on' or 'off'"
        exit
    ;;
esac
