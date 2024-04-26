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


# show help message
display_help() {
  echo "Install ocelot.social and/or optional infrastructure pods"
  echo "Usage: script.sh [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help           Displays this help message"
  echo "  -c, --certmanager    Option -c: Certificate manager"
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
  # checking the options with while and getopts
  while getopts ":hcn:o:" opt; do
    case ${opt} in
      h | help)
        display_help
        exit 0
        ;;
      c | certmanager)
        echo "Install certmanager …"
        # Fügen Sie hier den entsprechenden Befehl für -c hinzu
        echo "certmanager SUCCESSfully installed!"
        ;;
      n | nginx)
        echo "Install nginx …"
        # Fügen Sie hier den entsprechenden Befehl für -n hinzu
        echo "nginx SUCCESSfully installed!"
        ;;
      o | ocelot)
        echo "Install ocelot.social …"
        # Fügen Sie hier den entsprechenden Befehl für -o hinzu
        echo "ocelot.social SUCCESSfully installed!"
        ;;
      \?)
        echo "Invalid option: -$OPTARG" >&2
        display_help
        exit 1
        ;;
    esac
  done

  # check whether an option has been specified
  if [ $OPTIND -eq 1 ]; then
    display_error
    exit 1
  fi
}

# call main function
main "$@"