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
# use Docker version 24.0.6 or newer
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

### MinIO Storage Full

This is for development and test setups only, never for production: the steps below
wipe the database and all uploaded files, and the production image has neither the
reset nor the seed scripts.

Uploads (seeding included) can fail with:

```text
XMinioStorageFull: Storage backend has reached its minimum free drive threshold.
Please delete a few objects to proceed.
```

MinIO refuses to write once the drive under its volume is almost full. With Docker
Desktop, that drive is the disk of Docker's virtual machine, which all images,
containers, volumes and the build cache share. MinIO's own data is usually a small
part of it. See where the space actually goes:

```bash
# in main folder
$ docker system df
$ docker compose exec minio df -h /data
```

**Free Docker's disk.** This is usually what helps. The build cache can always go;
the next build only takes longer:

```bash
$ docker builder prune -af
```

`docker system df` also lists volumes as reclaimable. Do not reach for
`docker volume prune -a` without looking first: it deletes every volume no running
container uses, including the databases of other projects and of stacks that are
just stopped. Check `docker volume ls` and remove what you are sure of one by one.
Docker Desktop can also give its VM a larger disk (Settings → Resources).

**Empty MinIO with the database.** `db:reset` clears Neo4j but leaves the uploaded
files where they are, so the files of every seeding pile up in MinIO. Add
`--with-uploads` to empty the bucket as well. Every object in `AWS_BUCKET` is deleted;
the bucket and its policy stay. It works through the S3 API, so it also works against
a real S3, and like `db:reset` itself it runs only where `DB_WIPE_ALLOWED=true`. Seed
again afterwards:

```bash
# in main folder while docker compose is up, the backend in a container
$ docker compose exec backend npm run db:reset -- --with-uploads
$ docker compose exec backend npm run db:seed

# in folder backend/, the backend run on the host
$ npm run db:reset -- --with-uploads
$ npm run db:seed
```

Without `--with-uploads`, `db:reset` leaves the files alone, on purpose: on staging the
bucket is a real S3, and wiping the database should not take its files by surprise.

If MinIO itself does not start any more, the bucket cannot be reached this way.
Remove its volume instead and let `minio-mc` create the `ocelot` bucket again. As
above, look up the real volume name first, and remove only that one volume:

```bash
# in main folder
$ docker volume ls --filter name=minio_data
$ docker compose rm -sf minio minio-mc
$ docker volume rm ocelot-social_minio_data
$ docker compose up -d minio
# creates the bucket in the foreground: done, with exit code 0, once the bucket is there
$ docker compose run --rm minio-mc
```

`minio-mc` creates the bucket only a few seconds after it starts. Run in the
foreground as above, the command returns once that is done; seed only after it: an
upload before the bucket exists fails, and the seed stops with it. As the files are gone, reset and seed the database afterwards
(with or without `--with-uploads`, the bucket is empty either way).

## Local Installation

For a full documentation of the local installation see [summary](./SUMMARY.md).
