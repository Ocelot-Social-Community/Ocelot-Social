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


# see https://kodekloud.com/blog/bash-getopts/
while getopts -l "certmanager,ocelot,nginx" -- "chon" option; do
  case ${option} in
    h) # display help
      echo
      echo "Syntax: scriptTemplate [-c|h|o|n]"
      echo "options:"
      echo "c     certmanager"
      echo "h     help"
      echo "o     ocelot"
      echo "n     nginx"
      echo
      ;;
    c | certmanager) # certmanager
      echo "certmanager"
      ;;
    o) # ocelot
      echo "ocelot"
      ;;
    n) # nginx
      echo "nginx"
      ;;
    *) # invalid option
      echo "Invalid option: -${OPTARG}."
      exit 1
      ;;
   esac
done
