#!/bin/bash

# time stamp
printf "\nMultiple backups started at:\n  "
date

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# save old CONFIGURATION for later reset
SAVE_CONFIGURATION=$CONFIGURATION

# export all variables in "../.env"
set -a            
source ${SCRIPT_DIR}/../.env
set +a

# check BACKUP_CONFIGURATIONS
if [[ -z ${BACKUP_CONFIGURATIONS} ]]; then
  echo "You must provide a `BACKUP_CONFIGURATIONS` via environment variable"
  exit 1
fi

# convert configurations to array
IFS=' ' read -a CONFIGURATIONS_ARRAY <<< "$BACKUP_CONFIGURATIONS"

# display the clusters
printf "Backup the clusters:\n"
for i in "${CONFIGURATIONS_ARRAY[@]}"
do
  echo "  $i"
done
echo "Cancel by ^C. You have 15 seconds"
# wait for the admin to react
sleep 15

printf "\n"

for i in "${CONFIGURATIONS_ARRAY[@]}"
do
  CONFIGURATION=$i
  # individual cluster backup
  ${SCRIPT_DIR}/cluster.backup.sh

  # deleting backups?
  if (( BACKUP_SAVED_BACKUPS_NUMBER >= 1 )); then
    # delete all oldest backups, but leave the last BACKUP_SAVED_BACKUPS_NUMBER

    keep=$BACKUP_SAVED_BACKUPS_NUMBER
    path="$SCRIPT_DIR/../configurations/$CONFIGURATION/backup/"

    cd $path

    printf "In\n  '$path'\n  remove:\n"
    # TODO: replace 'ls' by 'find . -type d -maxdepth 1'? description: https://unix.stackexchange.com/questions/28939/how-to-delete-the-oldest-directory-in-a-given-directory
    while [ `ls -1 | wc -l` -gt $keep ]; do
      oldest=`ls -c1 | head -1`
      echo "  $oldest"
      rm -rf $oldest
    done

    printf "Keep the last %d backups:\n  " $BACKUP_SAVED_BACKUPS_NUMBER
    ls

    cd $SCRIPT_DIR
  else
    echo "!!! ATTENTION: No backups are deleted !!!"
  fi

  printf "\n"
done

# reset CONFIGURATION to old
# TODO: clearily if this is the same as: $ export CONFIGURATION=${SAVE_CONFIGURATION}"
CONFIGURATION=$SAVE_CONFIGURATION
echo "Reset to CONFIGURATION=$CONFIGURATION"
