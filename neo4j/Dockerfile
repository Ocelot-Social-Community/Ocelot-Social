FROM neo4j:3.5.14

ARG BUILD_COMMIT
ENV BUILD_COMMIT=$BUILD_COMMIT

RUN apt-get update && apt-get -y install wget htop
RUN wget https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases/download/3.5.0.4/apoc-3.5.0.4-all.jar -P plugins/
