# Installation

How to run ocelot.social on your machine for development. The [README](./README.md#quick-start) has the short version; deploying a network for real is described in [deployment](./deployment/README.md).

## Clone the Repository

Clone the repository, this will create a new folder called `Ocelot-Social`:

Using HTTPS:

```bash
$ git clone https://github.com/Ocelot-Social-Community/Ocelot-Social.git
```

Using SSH:

```bash
$ git clone git@github.com:Ocelot-Social-Community/Ocelot-Social.git
```

Change into the new folder.

```bash
$ cd Ocelot-Social
```

## Docker Installation

Docker is a software development container tool that combines software and its dependencies into one standardized unit that contains everything needed to run it. This helps us to avoid problems with dependencies and makes installation easier.

### General Installation of Docker

There are [several ways to install Docker](https://docs.docker.com/get-docker/) on your computer or server.

Check the correct Docker installation by checking the version before proceeding. E.g. we have the following versions:

```bash
# use Docker Engine 28.0.0 or newer (see "Published Ports Bind to Loopback" below)
# includes Docker Compose
$ docker --version
```

### Start Ocelot-Social via Docker Compose

***ATTENTION:** For using Docker commands in Apple Silicon environments see [here](https://github.com/Ocelot-Social-Community/Ocelot-Social/blob/master/CONTRIBUTING.md#apple-silicon-platform).*

Prepare ENVs once beforehand:

```bash
# in folder webapp/
$ cp .env.template .env

# in folder backend/
$ cp .env.template .env
```

For Development:

```bash
# in main folder
$ docker compose up
```

For Production:

```bash
# in main folder
$ docker compose -f docker-compose.yml up
```

This will start all required Docker containers.  
In development, make sure your database is running on `http://localhost:7474/browser/` — production publishes only the Bolt port `7687`, not the Neo4j Browser.

#### Published Ports Bind to Loopback

All ports the compose files publish (`docker-compose.yml`, `docker-compose.override.yml`, `docker-compose.test.yml`) bind to `127.0.0.1`, so the stack is reachable from your own machine only. This is deliberate: Neo4j runs with `NEO4J_AUTH=none` and MinIO's root credentials are in the repository, so on a shared network — café or conference Wi-Fi — anyone could otherwise read and write the database and the uploads.

This needs **Docker Engine 28.0.0 or newer**. Before 28.0.0, hosts on the same local network segment (layer 2, e.g. the same Wi-Fi or switch) could still reach ports published to `127.0.0.1` ([Docker documentation](https://docs.docker.com/engine/network/port-publishing/)). On an older engine, upgrade or block the ports with a firewall.

To reach the stack from another machine, for example when it runs on a VM or server and the browser does not, set `DEV_BIND_ADDRESS` to the address to bind to:

```bash
# in main folder — all interfaces (IPv6: [::])
$ DEV_BIND_ADDRESS=0.0.0.0 docker compose up
```

Compose also reads it from a `.env` file in the main folder (which is gitignored). Only do this on a network you trust, or put a firewall in front of it: the services are no better protected than before. Containers reach each other by service name, which this does not affect.

Prefer `0.0.0.0` over a single address such as `192.168.1.5`: a single address replaces loopback instead of adding to it, so everything on the host that uses `localhost` — the backend tests, Cypress, `bolt://localhost:7687`, `localhost:9000` — no longer reaches the stack.

The browser on the other machine also needs the addresses the stack hands it to point at the host instead of at `localhost`, which there is the browser's own machine:

- `WEBSOCKETS_URI` (`webapp/.env`) for live updates, e.g. `ws://<host>:3000/api/graphql`
- `IMAGOR_PUBLIC_URL` (backend, `docker-compose.override.yml`) for images, e.g. `http://<host>:8000`
- `AWS_ENDPOINT` (backend, `docker-compose.override.yml`) for uploaded files, e.g. `http://<host>:9000`

An SSH tunnel avoids all of this and exposes nothing. Forward the webapp, the image server and the file storage, and every `localhost` address stays right:

```bash
$ ssh -L 3000:localhost:3000 -L 8000:localhost:8000 -L 9000:localhost:9000 <host>
```

Prepare database once before you start by running the following command in a second terminal:

```bash
# in main folder while docker compose is up — development
$ docker compose exec backend npm run db:migrate -- init
$ docker compose exec backend npm run db:migrate -- up
```

The production image carries only the compiled backend, so it migrates from the build — and it has no reset or seed:

```bash
# in main folder while docker compose -f docker-compose.yml is up — production
$ docker compose exec backend npm run prod:migrate -- init
$ docker compose exec backend npm run prod:migrate -- up
```

In development, clear and seed the database with demo data by running the following command as well in the second terminal:

```bash
# in main folder while docker compose is up — development only
$ docker compose exec backend npm run db:reset
$ docker compose exec backend npm run db:seed
```

For a closer description see [backend](./backend/README.md).  
For a full documentation of the Docker installation see [summary](./SUMMARY.md).

### One-time MinIO Volume Migration

MinIO stopped publishing free community images, so the development and test stacks
now use `cgr.dev/chainguard/minio` instead of `quay.io/minio/minio`. The new image
runs as UID `65532` where the old one ran as root, and the `minio_data` volume
written by the old image is owned by root. MinIO therefore cannot write to it and
aborts on startup:

```
FATAL Unable to initialize backend: Unable to write to the backend
Error: unable to rename (/data/.minio.sys/tmp -> …) file access denied,
       drive may be faulty, please investigate
```

Despite how it reads, this is a permission problem and not data loss. A fresh
volume needs no migration at all; only a volume the old image already wrote to
does.

Compose names the volume `minio_data` and prefixes it with the project name, which
defaults to the directory you cloned into. Look the real name up first and
substitute it in **both** commands below — the examples say
`ocelot-social_minio_data`, which is only correct for a clone in a directory called
`ocelot-social`:

```bash
$ docker volume ls --filter name=minio_data
```

Getting that name wrong is worse than a typo. `docker run -v` CREATES any volume it
does not find, so the `chown` would report success while operating on a new, empty
volume and leaving the real one untouched; `docker volume rm` would simply fail with
`no such volume`.

To keep the uploads, hand the ownership over once. Note that MinIO's own
`sudo chown -R nonroot. <path>` hint does not apply — the path lives inside a Docker
volume, not on the host:

```bash
# in main folder, with the stack stopped
$ docker compose rm -sf minio
$ docker run --rm -v ocelot-social_minio_data:/data busybox \
    chown -R 65532:65532 /data
```

If the uploads are expendable, discarding the volume works just as well. Remove only
that one volume — `docker compose down -v` would take the Neo4j data with it:

```bash
$ docker compose rm -sf minio
$ docker volume rm ocelot-social_minio_data
```

## Local Installation

For a full documentation of the local installation see [summary](./SUMMARY.md).
