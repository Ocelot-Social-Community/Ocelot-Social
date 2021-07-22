#!/bin/bash

# Functions
function join_by { local IFS="$1"; shift; echo "$*"; }

# Arguments:
CUR_JOB=$1
MAX_JOBS=$2

# Features
FEATURE_LIST=( $(find cypress/integration/ -maxdepth 1 -name "*.feature") )

# Calculation
MAX_FEATURES=$(find cypress/integration/ -maxdepth 1 -name "*.feature" -printf '.' | wc -m)
FEATURES_PER_JOB=$(expr $(expr ${MAX_FEATURES} + ${MAX_JOBS} - 1) / ${MAX_JOBS} )
FEATURES_SKIP=$(expr $(expr ${CUR_JOB} - 1 ) \* ${FEATURES_PER_JOB} )

# Comma separated list
echo $(join_by , ${FEATURE_LIST[@]:${FEATURES_SKIP}:${FEATURES_PER_JOB}})