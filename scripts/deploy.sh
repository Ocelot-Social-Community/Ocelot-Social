#!/usr/bin/env bash
sed -i "s/<COMMIT>/${TRAVIS_COMMIT}/g" $TRAVIS_BUILD_DIR/scripts/patches/patch-deployment.yaml
sed -i "s/<COMMIT>/${TRAVIS_COMMIT}/g" $TRAVIS_BUILD_DIR/scripts/patches/patch-configmap.yaml
kubectl -n ocelot-social patch configmap develop-configmap -p "$(cat $TRAVIS_BUILD_DIR/scripts/patches/patch-configmap.yaml)"
kubectl -n ocelot-social patch deployment develop-backend -p "$(cat $TRAVIS_BUILD_DIR/scripts/patches/patch-deployment.yaml)"
kubectl -n ocelot-social patch deployment develop-webapp -p "$(cat $TRAVIS_BUILD_DIR/scripts/patches/patch-deployment.yaml)"
