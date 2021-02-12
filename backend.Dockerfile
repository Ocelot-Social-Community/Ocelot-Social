##################################################################################
# BRANDED ########################################################################
##################################################################################
FROM ocelotsocialnetwork/backend:latest as branded

# Copy public constants to the docker image branding it
COPY constants/links.js src/config/
COPY constants/metadata.js src/config/
