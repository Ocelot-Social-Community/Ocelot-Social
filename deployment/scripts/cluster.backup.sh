#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
CONFIGURATION=${CONFIGURATION:-"example"}
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}
BACKUP_DATE=$(date "+%F_%H-%M-%S")
BACKUP_FOLDER=${BACKUP_FOLDER:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/backup/${BACKUP_DATE}}

# create backup fodler
mkdir -p ${BACKUP_FOLDER}

# maintenance mode on
${SCRIPT_DIR}/cluster.maintenance.sh on

# shutdown database
kubectl --kubeconfig=${KUBECONFIG} get deployment ocelot-neo4j -o json \
    | jq '.spec.template.spec.containers[] += {"command": ["tail", "-f", "/dev/null"]}' \
    | kubectl --kubeconfig=${KUBECONFIG} apply -f -

# wait for the container to restart
sleep 60

# database backup
kubectl --kubeconfig=${KUBECONFIG} -n default exec -it \
    $(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-neo4j | awk '{ print $1 }') \
    -- neo4j-admin dump --to=/var/lib/neo4j/$BACKUP_DATE-neo4j-dump
# copy neo4j backup to local drive
kubectl --kubeconfig=${KUBECONFIG} cp \
    default/$(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-neo4j |awk '{ print $1 }'):/var/lib/neo4j/$BACKUP_DATE-neo4j-dump $BACKUP_FOLDER/neo4j-dump
# copy image data
kubectl --kubeconfig=${KUBECONFIG} cp \
    default/$(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-backend |awk '{ print $1 }'):/app/public/uploads $BACKUP_FOLDER/public-uploads

# restart database
kubectl --kubeconfig=${KUBECONFIG} get deployment ocelot-neo4j -o json \
    | jq 'del(.spec.template.spec.containers[].command)' \
    | kubectl --kubeconfig=${KUBECONFIG} apply -f -

# wait for the container to restart
sleep 60

# maintenance mode off
${SCRIPT_DIR}/cluster.maintenance.sh off