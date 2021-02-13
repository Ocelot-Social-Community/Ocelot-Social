##################################################################################
# BRANDED ########################################################################
##################################################################################
FROM ocelotsocialnetwork/backend:latest as branded

# Copy public constants to the docker image branding it
COPY branding/constants/links.js src/config/
COPY branding/constants/metadata.js src/config/
