# Neo4J

Human Connection is a social network. Using a graph based database which can
model nodes and edges natively - a network - feels like an obvious choice. We
decided to use [Neo4j](https://neo4j.com/), the currently most used graph
database available. The community edition of Neo4J is Free and Open Source and
we try our best to keep our application compatible with the community edition
only.

## Installation With Docker

Run:

```bash
docker-compose up
```

You can access Neo4J through [http://localhost:7474/](http://localhost:7474/)
for an interactive cypher shell and a visualization of the graph.


## Installation Without Docker

Install the community edition of [Neo4j](https://neo4j.com/) along with the plugin
[Apoc](https://github.com/neo4j-contrib/neo4j-apoc-procedures) on your system.

To do so, go to [releases](https://neo4j.com/download-center/#releases), choose
"Community Server", download the installation files for you operation system
and unpack the files.

Download [Neo4j Apoc](https://github.com/neo4j-contrib/neo4j-apoc-procedures/releases)
and drop the `.jar` file into the `plugins` folder of the just extracted Neo4j-Server.

Then make sure to allow Apoc procedures by adding the following line to your Neo4j configuration \(`conf/neo4j.conf`\):

```
dbms.security.procedures.unrestricted=apoc.*
```

### Alternatives

You can download [Neo4j Desktop](https://neo4j.com/download/) and run locally
for development, spin up a
[hosted Neo4j Sandbox instance](https://neo4j.com/download/), run Neo4j in one
of the [many cloud options](https://neo4j.com/developer/guide-cloud-deployment/),
[spin up Neo4j in a Docker container](https://neo4j.com/developer/docker/),
on Arch linux you can install [neo4j-community from AUR](https://aur.archlinux.org/packages/neo4j-community/)
or on Debian-based systems install [Neo4j from the Debian Repository](http://debian.neo4j.org/).
Just be sure to update the Neo4j connection string and credentials accordingly
in `backend/.env`.

Start Neo4J and confirm the database is running at [http://localhost:7474](http://localhost:7474).

## Operations on Neo4j

### Docker or Docker Compose

- we need to set `command: ["tail", "-f", "/dev/null"]` in the Neo4j block of `docker-compose.yml` on top level so the Neo4j database is in maintenance mode

### Create Neo4j Dump

To create a dump in Neo4j running in a Docker container:

- set the database to maintenance mode, see above
- entering the following commands:

```bash
# connect to the Docker containers Neo4j terminal
$ docker exec -it neo4j bash
# generate Dump
neo4j% neo4j-admin dump --database=graph.db --to=/var/lib/neo4j/$(date +%F)-neo4j-dump
# exit bash
neo4j% exit
# copy the dump out of the running Docker container
$ docker cp <docker-image-name('neo4j')>:/var/lib/neo4j/neo4j-dump <local-folder-path>/$(date +%F)-neo4j-dump
```

### Import Neo4j Dump

To import a dump into Neo4j running in a Docker container:

- set the database to maintenance mode, see above
- entering the following commands:

```bash
# copy the dump into the running Docker container
$ docker cp <local-folder-path>/neo4j-dump <docker-image-name('neo4j')>:/var/lib/neo4j/$(date +%F)-neo4j-dump
# connect to the Docker containers Neo4j terminal
$ docker exec -it neo4j bash
# to load the dump into the database we need the following command in this terminal
neo4j% neo4j-admin load --database=neo4j --from /var/lib/neo4j/$(date +%F)-neo4j-dump --force
# leave the terminal by entering
neo4j% exit
```

## Commands

Here we describe some rarely used Cypher commands for Neo4j that are needed from time to time:

### Index And Constraint Commands

If indexes or constraints are missing or not set correctly, the browser search will not work or the database seed for development will not work.

The indexes and constraints of our database are set in `backend/src/db/migrate/store.js`.
This is where the magic happens.

It's called by our `prod:migrate init` command.
This command initializes the Admin user and creates all necessary indexes and constraints in the Neo4j database.

***Calls in development***

Locally without Docker:

```bash
# in backend folder
$ yarn prod:migrate init
```

Locally with Docker:

```bash
# in main folder
$ docker compose exec backend yarn prod:migrate init
```

***Calls in production***

Locally with Docker:

```bash
# in main folder
$ docker compose exec backend /bin/sh -c "yarn prod:migrate init"
```

On a server with Kubernetes cluster:

```bash
# tested for one backend replica
# !!! be aware of the kubectl context !!!
$ kubectl -n default exec -it $(kubectl -n default get pods | grep ocelot-backend | awk '{ print $1 }') -- /bin/sh -c "yarn prod:migrate init"
```

***Cypher commands to show indexes and constraints***

```bash
# in browser command line or cypher shell

# show all indexes and constraints
$ :schema

# show all indexes
$ CALL db.indexes();

# show all constraints
$ CALL db.constraints();
```

***Cypher commands to create and drop indexes and constraints***

```bash
# in browser command line or cypher shell

# create indexes
$ CALL db.index.fulltext.createNodeIndex("post_fulltext_search",["Post"],["title", "content"]);
$ CALL db.index.fulltext.createNodeIndex("user_fulltext_search",["User"],["name", "slug"]);
$ CALL db.index.fulltext.createNodeIndex("tag_fulltext_search",["Tag"],["id"]);

# drop an index
$ DROP CONSTRAINT ON ( image:Image ) ASSERT image.url IS UNIQUE

# drop all indexes and constraints
$ CALL apoc.schema.assert({},{},true) YIELD label, key RETURN * ;
```
