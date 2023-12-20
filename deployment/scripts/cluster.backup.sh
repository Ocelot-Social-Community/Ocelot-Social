#!/bin/bash

# time stamp
printf "Backup started at:\n  "
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
BACKUP_DATE=$(date "+%F_%H-%M-%S")
BACKUP_FOLDER=${BACKUP_FOLDER:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/backup/${BACKUP_DATE}}

printf "Backup folder name:  %s\n" $BACKUP_DATE
# create backup folder
mkdir -p ${BACKUP_FOLDER}

# cluster maintenance mode on && Neo4j maintenance mode on
${SCRIPT_DIR}/cluster.neo4j.sh maintenance on

# database backup
echo "Dumping database ..."
kubectl --kubeconfig=${KUBECONFIG} -n default exec -it \
    $(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-neo4j | awk '{ print $1 }') \
    -- neo4j-admin dump --to=/var/lib/neo4j/$BACKUP_DATE-neo4j-dump
# copy neo4j backup to local drive
echo "Copying database to local file system ..."
kubectl --kubeconfig=${KUBECONFIG} cp \
    default/$(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-neo4j |awk '{ print $1 }'):/var/lib/neo4j/$BACKUP_DATE-neo4j-dump $BACKUP_FOLDER/neo4j-dump
# copy image data
echo "Copying public uploads to local file system ..."
kubectl --kubeconfig=${KUBECONFIG} cp \
    default/$(kubectl --kubeconfig=${KUBECONFIG} -n default get pods | grep ocelot-backend |awk '{ print $1 }'):/app/public/uploads $BACKUP_FOLDER/public-uploads

# Neo4j maintenance mode off && cluster maintenance mode off
${SCRIPT_DIR}/cluster.neo4j.sh maintenance off