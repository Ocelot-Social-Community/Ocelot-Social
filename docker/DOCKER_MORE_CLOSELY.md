# Docker

## Apple M1 Platform

***Attention:** For using Docker commands in Apple M1 environments!*

```bash
# set env variable for your shell
$ export DOCKER_DEFAULT_PLATFORM=linux/amd64
```

For even more informations, see [Docker More Closely](#docker-more-closely)

### Docker Compose Override File For Apple M1 Platform

For Docker compose `up` or `build` commands, you can use our Apple M1 override file that specifies the M1 platform:

```bash
# in main folder

# for production
$ docker compose -f docker-compose.yml -f docker-compose.apple-m1.override.yml up

# for production testing Docker images from DockerHub
$ docker compose -f docker-compose.ocelotsocial-branded.yml -f docker-compose.apple-m1.override.yml up

# only once: init admin user and create indexes and contraints in Neo4j database
$ docker compose exec backend /bin/sh -c "yarn prod:migrate init"
```

## Docker More Closely In Main Code

To get more informations about the Apple M1 platform and to analyze the Docker builds etc. you find our documentation in our main code, [here](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/DOCKER_MORE_CLOSELY.md).
