#!/bin/sh

# Find current directory & configure paths
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)
PROJECT_ROOT=$SCRIPT_DIR/../..
# by default this will create folders in the project root
DEPLOY_DIR=${1:-test}
BUILD_DIR=$PROJECT_ROOT/styleguide/docs

# assuming you are already on the right branch
git pull -ff

# Deploy physical Location
GIT_REF=$(git rev-parse --short HEAD)
DEPLOY_DIR_REF=$DEPLOY_DIR-$GIT_REF

## Parameter is a proper directory?
if [ -d "$DEPLOY_DIR_REF" ]; then
    return "Directory '$DEPLOY_DIR_REF' does already exist" 2>/dev/null || exit 1
fi

## Build the project
cd $PROJECT_ROOT/styleguide
rm -R $BUILD_DIR
yarn install
yarn run build

## Copy files and Sym link to deploy dir
mkdir "$DEPLOY_DIR_REF/"
cp -r $BUILD_DIR/* "$DEPLOY_DIR_REF/"
ln -sfn "$DEPLOY_DIR_REF" $DEPLOY_DIR