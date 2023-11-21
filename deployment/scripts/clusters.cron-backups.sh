#!/bin/bash

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# export all variables in "../.env"
set -a            
source ${SCRIPT_DIR}/../.env
set +a

# check BACKUP_CONFIGURATIONS
if [ -z ${BACKUP_CONFIGURATIONS} ]; then
  echo "You must provide a `BACKUP_CONFIGURATIONS` via environment variable"
  exit 1
fi

# convert configurations to array
CONFIGURATIONS_ARRAY=($BACKUP_CONFIGURATIONS)

# display the clusters
echo "Backup the clusters:"
for i in "${CONFIGURATIONS_ARRAY[@]}"
do
  echo $i
done
echo "Cancel by ^C. You have 20 seconds"
# wait for the admin to react
sleep 20

# save old CONFIGURATION for later reset
SAVE_CONFIGURATION=$CONFIGURATION

for i in "${CONFIGURATIONS_ARRAY[@]}"
do
  CONFIGURATION=$i
  # individual cluster backup
  ${SCRIPT_DIR}/cluster.backup.sh
done

# reset CONFIGURATION to old
CONFIGURATION=$SAVE_CONFIGURATION
echo "Reset to CONFIGURATION=${CONFIGURATION}"
