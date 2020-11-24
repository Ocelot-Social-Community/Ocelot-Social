FROM neo4j:3.5.14
LABEL Description="Neo4J database of the Social Network ocelot.social with preinstalled database constraints and indices" Vendor="ocelot.social Community" Version="0.0.1" Maintainer="ocelot.social Community (devops@ocelot.social)"
# community edition 👆🏼, because we have no enterprise licence 👇🏼 at the moment
# FROM neo4j:3.5.14-enterprise

ARG BUILD_COMMIT
ENV BUILD_COMMIT=$BUILD_COMMIT

RUN apt-get update && apt-get -y install wget htop
RUN wget https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/3.5.0.4/apoc-3.5.0.4-all.jar -P plugins/
