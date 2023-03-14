#!/bin/bash

# generate a secret and store it in the SECRET file.
# Note that this overwrites the existing file

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# configuration
CONFIGURATION=${CONFIGURATION:-"example"}
SECRET_FILE=${SCRIPT_DIR}/../configurations/${CONFIGURATION}/SECRET

openssl rand -base64 32 > ${SECRET_FILE}