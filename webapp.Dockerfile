##################################################################################
# BRANDED ########################################################################
##################################################################################
FROM ocelotsocialnetwork/webapp:latest as branded

# Copy public constants to the docker image branding it
COPY branding/static/ static/
COPY branding/constants/ constants/
