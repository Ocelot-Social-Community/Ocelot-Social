#!/bin/bash

# decrypt secrets in the selected configuration
# Note that existing decrypted files will be overwritten

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [ -z ${CONFIGURATION} ]; then
  echo "You must provide a `CONFIGURATION` via environment variable"
  exit 1
fi

# configuration
SECRET=${SECRET}
SECRET_FILE=${SCRIPT_DIR}/../configurations/${CONFIGURATION}/SECRET
FILES=(\
    "${SCRIPT_DIR}/../configurations/${CONFIGURATION}/.env" \
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

# decrypt
for file in "${FILES[@]}"
do
  if [ -f "${file}.enc" ]; then
    #gpg --symmetric --batch --passphrase="${SECRET}" --cipher-algo AES256 --output ${file}.enc ${file} 
    gpg --quiet --batch --yes --decrypt --passphrase="${SECRET}" --output ${file} ${file}.enc
    echo "Decrypted ${file}"
  fi
done

echo "DONE"
# gpg --quiet --batch --yes --decrypt --passphrase="${SECRET}" \
# --output $HOME/secrets/my_secret.json my_secret.json.gpg
