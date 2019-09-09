#!/usr/bin/env bash

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" != "master" ]; then
  exit 1
fi

CURRENT_VERSION=$(cat package.json  | jq -r .version)
PUBLISHED_VERSION=$(yarn info @human-connection/styleguide version --silent)

if [ "$CURRENT_VERSION" == "$PUBLISHED_VERSION" ]; then
  exit 1
fi


exit 0
