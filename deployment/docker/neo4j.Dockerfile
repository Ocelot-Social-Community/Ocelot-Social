ARG APP_IMAGE=ocelotsocialnetwork/neo4j-community
ARG APP_IMAGE_TAG=latest
ARG APP_IMAGE_COMMUNITY=${APP_IMAGE}:${APP_IMAGE_TAG}

##################################################################################
# COMMUNITY ######################################################################
##################################################################################
FROM $APP_IMAGE_COMMUNITY as community-branded

##################################################################################
# ENTERPRISE #####################################################################
##################################################################################
# Todo: refactor this with 'APP_IMAGE', 'APP_IMAGE_TAG', and similar to 'APP_IMAGE_COMMUNITY', Neo4j 'dockerfile' from main code
FROM ocelotsocialnetwork/neo4j-enterprise:latest as enterprise-branded
