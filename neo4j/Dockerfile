FROM amd64/neo4j:4.4-community AS community
LABEL org.label-schema.name="ocelot.social:neo4j"
LABEL org.label-schema.description="Neo4J database of the Social Network Software ocelot.social with preinstalled database constraints and indices"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/neo4j"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"
## install: wget, htop (TODO: why do we need htop?)
RUN apt-get update && apt-get -y install wget htop
## install: apoc plugin for neo4j
RUN wget https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/4.4.0.17/apoc-4.4.0.17-all.jar -P plugins/

FROM neo4j:4.4-enterprise AS enterprise
LABEL org.label-schema.name="ocelot.social:neo4j"
LABEL org.label-schema.description="Neo4J database of the Social Network Software ocelot.social with preinstalled database constraints and indices"
LABEL org.label-schema.usage="https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/README.md"
LABEL org.label-schema.url="https://ocelot.social"
LABEL org.label-schema.vcs-url="https://github.com/Ocelot-Social-Community/Ocelot-Social/tree/master/neo4j"
LABEL org.label-schema.vendor="ocelot.social Community"
LABEL org.label-schema.schema-version="1.0"
LABEL maintainer="devops@ocelot.social"
## install: wget, htop (TODO: why do we need htop?)
RUN apt-get update && apt-get -y install wget htop
## install: apoc plugin for neo4j
RUN wget https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/4.4.0.17/apoc-4.4.0.17-all.jar -P plugins/
