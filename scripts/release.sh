#!/bin/sh

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)
ROOT_DIR=$SCRIPT_DIR/..

# Update Version
cd $ROOT_DIR
yarn version --no-git-tag-version --no-commit-hooks --no-commit
VERSION_NEW=$(node -p -e "require('$ROOT_DIR/package.json').version")

## packages
cd backend
yarn version --no-git-tag-version --no-commit-hooks --no-commit --new-version $VERSION_NEW
cd $ROOT_DIR/frontend
yarn version --no-git-tag-version --no-commit-hooks --no-commit --new-version $VERSION_NEW
cd $ROOT_DIR/webapp
yarn version --no-git-tag-version --no-commit-hooks --no-commit --new-version $VERSION_NEW
cd $ROOT_DIR/webapp/maintenance/source
yarn version --no-git-tag-version --no-commit-hooks --no-commit --new-version $VERSION_NEW

## helm
sed -i -e 's/appVersion: ".*"/appVersion: "'"$VERSION_NEW"'"/g' $ROOT_DIR/deployment/helm/charts/ocelot-neo4j/Chart.yaml
sed -i -e 's/appVersion: ".*"/appVersion: "'"$VERSION_NEW"'"/g' $ROOT_DIR/deployment/helm/charts/ocelot-social/Chart.yaml

# generate changelog
cd $ROOT_DIR
yarn run auto-changelog --commit-limit 0 --latest-version $VERSION_NEW