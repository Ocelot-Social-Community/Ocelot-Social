#!/bin/bash

# time stamp
printf "Tunnel started at:\n  "
date

# base setup
SCRIPT_PATH=$(realpath $0)
SCRIPT_DIR=$(dirname $SCRIPT_PATH)

# check CONFIGURATION
if [[ -z "$CONFIGURATION" ]]; then
  echo "!!! You must provide a CONFIGURATION via environment variable !!!"
  exit 1
fi

printf "  Cluster:  %s\n" $CONFIGURATION

# configuration
KUBECONFIG=${KUBECONFIG:-${SCRIPT_DIR}/../configurations/${CONFIGURATION}/kubeconfig.yaml}

kubectl --kubeconfig=${KUBECONFIG} get pods -n kubernetes-dashboard
#kubectl --kubeconfig=${KUBECONFIG} get -o json -n kubernetes-dashboard pod kubernetes-dashboard-kong-5ccb57895b-vxxmf

# export POD_NAME=$(kubectl --kubeconfig=${KUBECONFIG} get pods -n kubernetes-dashboard  -l "app.kubernetes.io/name=kubernetes-dashboard-kong,app.kubernetes.io/instance=kubernetes-dashboard" -o jsonpath="{.items[0].metadata.name}")
export POD_NAME=kubernetes-dashboard-kong-5ccb57895b-fzqk6
# export POD_NAME=$(kubectl --kubeconfig=${KUBECONFIG} get pods -n kubernetes-dashboard -l "app.kubernetes.io/name=kubernetes-dashboard,app.kubernetes.io/instance=kubernetes-dashboard" -o jsonpath="{.items[0].metadata.name}")

echo $POD_NAME
kubectl --kubeconfig=${KUBECONFIG} -n kubernetes-dashboard port-forward $POD_NAME 8443:8443

# kubectl --kubeconfig=${KUBECONFIG} -n kubernetes-dashboard create token admin-user

# kubectl --kubeconfig=${KUBECONFIG} apply -f ${SCRIPT_DIR}/../scripts/admin-user.yml



