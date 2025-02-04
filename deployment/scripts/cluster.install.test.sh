#!/bin/bash

# show help message
display_help() {
  echo "Install ocelot.social and/or optional infrastructure pods"
  echo "Usage: script.sh [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help           Displays this help message"
  echo "  -c, --cert-manager   Option -c: Certificate manager"
  echo "  -n, --nginx          Option -n: nginx"
  echo "  -o, --ocelot         Option -o: ocelot.social"
}

# standard message if no option has been specified
display_error() {
  echo "Error: An option is required."
  echo "Use -h or --help for more information."
}

# main function
main() {
  certmanager_selected=false
  nginx_selected=false
  ocelot_selected=false

  # checking the options with while
  while [[ $# -gt 0 ]]; do
    case $1 in
      -h | --help)
        display_help
        exit 0
        ;;
      -n | --nginx)
        nginx_selected=true
        ;;
      -c | --cert-manager)
        certmanager_selected=true
        ;;
      -o | --ocelot)
        ocelot_selected=true
        ;;
      *)
        echo "Invalid option: $1" >&2
        display_help
        exit 1
        ;;
    esac
    shift
  done

  # Überprüfen, ob mindestens eine Option angegeben wurde
  if [[ $certmanager_selected == false && $nginx_selected == false && $ocelot_selected == false ]]; then
    display_error
    exit 1
  fi


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


  if $nginx_selected; then
    echo "Install nginx …"

    ## install Ingress-Nginx
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    helm install \
      ingress-nginx ingress-nginx/ingress-nginx \
      --kubeconfig=${KUBECONFIG} \
      -f ${SCRIPT_DIR}/../src/kubernetes/nginx.values.yaml

    echo "nginx SUCCESSfully installed!"
  fi

  # Installationslogik entsprechend der Reihenfolge der Optionen
  if $certmanager_selected; then
    echo "Install cert-manager …"

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

    echo "cert-manager SUCCESSfully installed!"
  fi

  if $ocelot_selected; then
    echo "Install ocelot.social …"

    ## install ocelot.social with helm
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

    echo "ocelot.social SUCCESSfully installed!"
    echo "!!! You must install a firewall or similar !!! (for DigitalOcean see: deployment/src/kubernetes/README.md)"
  fi
}


# call main function
main "$@"