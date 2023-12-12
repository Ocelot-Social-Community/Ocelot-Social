#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [[ -z "$CONFIGURATION" ]] || [[ $CONFIGURATION == "" ]]; then
  echo "You must provide a `CONFIGURATION` via environment variable"
  exit 1
fi

# configuration
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}

case $1 in
    maintenance)
        case $2 in
            on)
                # maintenance mode on
                ${SCRIPT_DIR}/cluster.maintenance.sh on

                # set Neo4j in offline mode (maintenance)
                echo "Neo4j maintenance:  on"
                kubectl --kubeconfig=${KUBECONFIG} get deployment ocelot-neo4j -o json \
                    | jq '.spec.template.spec.containers[] += {"command": ["tail", "-f", "/dev/null"]}' \
                    | kubectl --kubeconfig=${KUBECONFIG} apply -f -

                # wait for the container to restart
                echo "Wait 60s ..."
                sleep 60
            ;;
            off)
                # set Neo4j in online mode
                echo "Neo4j maintenance:  off"
                kubectl --kubeconfig=${KUBECONFIG} get deployment ocelot-neo4j -o json \
                    | jq 'del(.spec.template.spec.containers[].command)' \
                    | kubectl --kubeconfig=${KUBECONFIG} apply -f -

                # wait for the container to restart
                echo "Wait 60s ..."
                sleep 60

                # maintenance mode off
                ${SCRIPT_DIR}/cluster.maintenance.sh off
            ;;
            *)
                echo -e "Run this script with first argument either 'off' or 'on'"
                exit
            ;;
        esac
    ;;
    *)
        echo -e "Run this script with first argument 'maintenance'"
        exit
    ;;
esac
