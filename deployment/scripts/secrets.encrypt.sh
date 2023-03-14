#!/bin/bash

# encrypt secrets in the selected configuration
# Note that existing encrypted files will be overwritten

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
CONFIGURATION=${CONFIGURATION:-"example"}
SECRET=${SECRET}
SECRET_FILE=${SCRIPT_DIR}/../configurations/${CONFIGURATION}/SECRET
FILES=(\
    "${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml" \
    "${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubernetes/values.yaml" \
    "${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubernetes/dns.values.yaml" \
  )

# Load SECRET from file if it is not set explicitly
if [ -z ${SECRET} ] && [ -f "${SECRET_FILE}" ]; then
  SECRET=$(<${SECRET_FILE})
fi

# exit when there is no SECRET set
if [ -z ${SECRET} ]; then
  echo "No SECRET provided and no SECRET-File found."
  exit 1
fi

# encrypt
for file in "${FILES[@]}"
do
  if [ -f "${file}" ]; then
    gpg --symmetric --batch --yes --passphrase="${SECRET}" --cipher-algo AES256 --output ${file}.enc ${file} 
    echo "Encrypted ${file}"
  fi
done

echo "DONE"
