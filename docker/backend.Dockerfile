##################################################################################
# BRANDED ########################################################################
##################################################################################
ARG APP_IMAGE=ocelotsocialnetwork/backend:latest
FROM $APP_IMAGE as branded

# Copy public constants to the docker image and branding it
COPY branding/constants/links.js src/config/
COPY branding/constants/metadata.js src/config/
