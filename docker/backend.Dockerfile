##################################################################################
# BRANDED ########################################################################
##################################################################################
ARG APP_IMAGE=ocelotsocialnetwork/backend:latest
FROM $APP_IMAGE as branded

# copy public constants into the Docker image to brand it
COPY branding/constants/links.js src/config/
COPY branding/constants/metadata.js src/config/
