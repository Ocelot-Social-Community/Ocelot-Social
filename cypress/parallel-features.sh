#!/bin/bash

# Functions
function join_by { local IFS="$1"; shift; echo "$*"; }

# Arguments:
CUR_JOB=$(expr $1 - 1)
MAX_JOBS=$2

# Features
FEATURE_LIST=( $(find cypress/integration/ -maxdepth 1 -name "*.feature") )

# Calculation
MAX_FEATURES=$(find cypress/integration/ -maxdepth 1 -name "*.feature" -print | wc -l)
# adds overhead features to the first jobs
if [[ $CUR_JOB -lt $(expr ${MAX_FEATURES} % ${MAX_JOBS}) ]]
then
  FEATURES_PER_JOB=$(expr ${MAX_FEATURES} / ${MAX_JOBS} + 1)
  FEATURES_SKIP=$(expr $(expr ${MAX_FEATURES} / ${MAX_JOBS} + 1) \* ${CUR_JOB})
else
  FEATURES_PER_JOB=$(expr ${MAX_FEATURES} / ${MAX_JOBS})
  FEATURES_SKIP=$(expr $(expr ${MAX_FEATURES} / ${MAX_JOBS} + 1) \* $(expr ${MAX_FEATURES} % ${MAX_JOBS}) + $(expr $(expr ${MAX_FEATURES} / ${MAX_JOBS}) \* $(expr ${CUR_JOB} - ${MAX_FEATURES} % ${MAX_JOBS})))
fi

# Comma separated list
echo $(join_by , ${FEATURE_LIST[@]:${FEATURES_SKIP}:${FEATURES_PER_JOB}})