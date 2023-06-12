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

# Install Ocelot
## Ingress-Nginx
#helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
#helm repo update
# helm --kubeconfig=${KUBECONFIG} install ingress-nginx ingress-nginx/ingress-nginx -f ${SCRIPT_DIR}/../src/kubernetes/nginx.values.yaml
#helm --kubeconfig=${KUBECONFIG} upgrade ingress-nginx ingress-nginx/ingress-nginx -f ${SCRIPT_DIR}/../src/kubernetes/nginx.values.yaml

## Install Ocelot
#helm --kubeconfig=${KUBECONFIG} install --values ${VALUES} ocelot ${SCRIPT_DIR}/../src/kubernetes
# kubectl --kubeconfig=${KUBECONFIG} describe certificates
#helm --kubeconfig=${KUBECONFIG} 

kubectl --kubeconfig=${KUBECONFIG} -n default exec -it $(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-backend | awk '{ print $1 }') -- /bin/sh -c "node --experimental-repl-await build/db/clean.js && node --experimental-repl-await build/db/seed.js"