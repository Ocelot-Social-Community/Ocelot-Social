#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [ -z ${CONFIGURATION} ]; then
  echo "You must provide a `CONFIGURATION` via environment variable"
  exit 1
fi

# configuration
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}
BACKUP_DATE=$(date "+%F_%H-%M-%S")
BACKUP_FOLDER=${BACKUP_FOLDER:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/backup/${BACKUP_DATE}}

# create backup fodler
mkdir -p ${BACKUP_FOLDER}

# maintenance mode on
# set Neo4j in offline mode (maintenance)
${SCRIPT_DIR}/cluster.neo4j.sh offline-mode

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

# set Neo4j in online mode
# maintenance mode off
${SCRIPT_DIR}/cluster.neo4j.sh online-mode