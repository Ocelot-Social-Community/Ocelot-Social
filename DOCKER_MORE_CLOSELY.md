# Docker More Closely

## Apple M1 Platform

***Attention:** For using Docker commands in Apple M1 environments!*

### Environment Variable For Apple M1 Platform

To set the Docker platform environment variable in your terminal tab, run:

```bash
# set env variable for your shell
$ export DOCKER_DEFAULT_PLATFORM=linux/amd64
```

### Docker Compose Override File For Apple M1 Platform

For Docker compose `up` or `build` commands, you can use our Apple M1 override file that specifies the M1 platform:

```bash
# in main folder

# for development
$ docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.apple-m1.override.yml up
# only once: init admin user and create indexes and constraints in Neo4j database
$ docker compose exec backend yarn prod:migrate init
# clean db
$ docker compose exec backend yarn db:reset
# seed db
$ docker compose exec backend yarn db:seed

# for production
$ docker compose -f docker-compose.yml -f docker-compose.apple-m1.override.yml up
# only once: init admin user and create indexes and constraints in Neo4j database
$ docker compose exec backend /bin/sh -c "yarn prod:migrate init"
```

## Analysing Docker Builds

To analyze a Docker build, there is a wonderful tool called [dive](https://github.com/wagoodman/dive). Please sponsor if you're using it!

The `dive build` command is exactly the right one to fulfill what we are looking for.
We can use it just like the `docker build` command and get an analysis afterwards.

So, in our main folder, we use it in the following way:

```bash
# in main folder
$ dive build --target <layer-name> -t "ocelotsocialnetwork/<app-name>:local-<layer-name>" --build-arg BBUILD_DATE="<build-date>" --build-arg BBUILD_VERSION="<build-version>" --build-arg BBUILD_COMMIT="<build-commit>" <app-folder-name-or-dot>/
```

The build arguments are optional.

For the specific applications, we use them as follows.

### Backend

#### Production For Backend

```bash
# in main folder
$ dive build --target production -t "ocelotsocialnetwork/backend:local-production" backend/
```

#### Development For Backend

```bash
# in main folder
$ dive build --target development -t "ocelotsocialnetwork/backend:local-development" backend/
```

### Webapp

#### Production For Webapp

```bash
# in main folder
$ dive build --target production -t "ocelotsocialnetwork/webapp:local-production" webapp/
```

#### Development For Webapp

```bash
# in main folder
$ dive build --target development -t "ocelotsocialnetwork/webapp:local-development" webapp/
```
