##################################################################################
# BRANDED ########################################################################
##################################################################################
ARG APP_IMAGE=ocelotsocialnetwork/webapp:latest
FROM $APP_IMAGE as branded

# Copy public constants to the docker image branding it
COPY branding/static/ static/
COPY branding/constants/ constants/
