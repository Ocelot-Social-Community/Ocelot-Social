#!/bin/bash


SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)


# DOCKER_BUILDKIT=0
# TODO this must be somehow defined as service within docker-compose and build order must be defined accordingly
#services:
#  basething:
#    image: unimportantlocalnameusedinfromstatement
#    build:
#      dockerfile: src/docker/baseimage
#      target: production
#      context: .
#    command: sleep 60
#  webapp:
#    image: myimage/webapp:local-production
#    depends_on:
#      - basething
#    build:
#      dockerfile: src/docker/webapp.Dockerfile
#      target: production
#      context: .

# Webapp
docker build --target base -t "ocelotsocialnetwork/webapp:local-base" $SCRIPT_DIR/../webapp/
docker build --target code -t "ocelotsocialnetwork/webapp:local-code" $SCRIPT_DIR/../webapp/
# Backend
docker build --target base -t "ocelotsocialnetwork/backend:local-base" $SCRIPT_DIR/../backend/
docker build --target code -t "ocelotsocialnetwork/backend:local-code" $SCRIPT_DIR/../backend/
# Maintenance
docker build --target base -t "ocelotsocialnetwork/maintenance:local-base" $SCRIPT_DIR/../webapp/ -f $SCRIPT_DIR/../webapp/Dockerfile.maintenance
docker build --target code -t "ocelotsocialnetwork/maintenance:local-code" $SCRIPT_DIR/../webapp/ -f $SCRIPT_DIR/../webapp/Dockerfile.maintenance