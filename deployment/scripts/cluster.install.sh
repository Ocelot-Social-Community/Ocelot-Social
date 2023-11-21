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


## install Ingress-Nginx
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install \
  ingress-nginx ingress-nginx/ingress-nginx \
  --kubeconfig=${KUBECONFIG} \
  -f ${SCRIPT_DIR}/../src/kubernetes/nginx.values.yaml

## install Cert-Manager
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install \
  cert-manager jetstack/cert-manager \
  --kubeconfig=${KUBECONFIG} \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.2 \
  --set installCRDs=true

## install Ocelot with helm
helm install \
  ocelot \
  --kubeconfig=${KUBECONFIG} \
  --values ${VALUES} \
  --set appVersion="${DOCKERHUB_OCELOT_TAG}" \
  ${SCRIPT_DIR}/../src/kubernetes/ \
  --timeout 10m

## set Neo4j database indexes, constrains, and initial admin account plus run migrate up
kubectl --kubeconfig=${KUBECONFIG} \
  -n default \
  exec -it \
  $(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-backend | awk '{ print $1 }') -- \
    /bin/sh -c "yarn prod:migrate init && yarn prod:migrate up"
    # /bin/sh -c "node --experimental-repl-await build/src/db/clean.js && node --experimental-repl-await build/src/db/seed.js"

echo "!!! You must install a firewall or similar !!! (for DigitalOcean see: deployment/src/kubernetes/README.md)"
