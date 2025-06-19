# Backend

## Installation with Docker

Run the following command to install everything through docker.

The installation takes a bit longer on the first pass or on rebuild ...

```sh
# in main folder
$ docker compose up
# or
# rebuild the containers for a cleanup
$ docker compose up --build
```

Wait a little until your backend is up and running at [http://localhost:4000/](http://localhost:4000/).

## Installation without Docker

For the local installation you need a recent version of
[Node](https://nodejs.org/en/) (&gt;= `v16.19.0`). We are using
`v22.13.1` and therefore we recommend to use the same version
([see](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4082)
some known problems with more recent node versions). You can use the
[node version manager](https://github.com/nvm-sh/nvm) `nvm` to switch
between different local Node versions:

```sh
# install Node
$ cd backend
$ nvm install v22.13.1
$ nvm use v22.13.1
```

Install node dependencies with [yarn](https://yarnpkg.com/en/):

```sh
# in main folder
$ cd backend
$ yarn install
# or just
$ yarn
# or just later on to use version of ".nvmrc" file
$ nvm use && yarn
```

Copy Environment Variables:

```sh
# in backend/
$ cp .env.template .env
```

Configure the new file according to your needs and your local setup. Make sure
a [local Neo4J](http://localhost:7474) instance is up and running.

Start the backend for development with:

```sh
# in backend/
$ yarn run dev
```

or start the backend in production environment with:

```sh
# in backend/
$ yarn run start
```

For e-mail delivery, please configure at least `SMTP_HOST` and `SMTP_PORT` in
your `.env` configuration file.

Your backend is up and running at [http://localhost:4000/](http://localhost:4000/)
This will start the GraphQL service \(by default on localhost:4000\) where you
can issue GraphQL requests or access GraphQL Playground in the browser.
More details about our GraphQL playground and how to use it with ocelot.social can be found [here](./src/graphql/GraphQL-Playground.md).

![GraphQL Playground](../.gitbook/assets/graphql-playground.png)

## Database

A fresh database needs to be initialized and migrated.

```sh
# in folder backend while database is running
yarn db:migrate init
# for docker environments:
docker exec ocelot-social-backend-1 yarn db:migrate init
# for docker production:
docker exec ocelot-social-backend-1 yarn prod:migrate init
```

```sh
# in backend with database running (In docker or local)
yarn db:migrate up

# for docker development:
docker exec ocelot-social-backend-1 yarn db:migrate up
# for docker production
docker exec ocelot-social-backend-1 yarn prod:migrate up
```

### Optional Data

You can seed some optional data into the database.

To create the default admin <admin@example.org> with password `1234` use:

```sh
# in backend with database running (In docker or local)
yarn db:data:admin
```

When using `CATEGORIES_ACTIVE=true` you also want to seed the categories with:

```sh
# in backend with database running (In docker or local)
yarn db:data:categories
```

### Branding Data

You might need to seed some branding specific data into the database.

To do so, run:

```sh
# in backend with database running (In docker or local)
yarn db:data:branding

# for docker
docker exec ocelot-social-backend-1 yarn db:data:branding
```

### Seed Data

For a predefined set of test data you can seed the database with:

```sh
# in backend with database running (In docker or local)
yarn db:seed

# for docker
docker exec ocelot-social-backend-1 yarn db:seed
```

### Reset Data

In order to reset the database you can run:

```sh
# in backend with database running (In docker or local)
yarn db:reset
# or deleting the migrations as well
yarn db:reset:withmigrations

# for docker
docker exec ocelot-social-backend-1 yarn db:reset
# or deleting the migrations as well
docker exec ocelot-social-backend-1 yarn db:reset:withmigrations
# you could also wipe out your neo4j database and delete all volumes with:
docker compose down -v
```

> Note: This just deletes the data and not the constraints, hence you do not need to rerun `yarn db:migrate init` or `yarn db:migrate up`.

### Data migrations

Although Neo4J is schema-less,you might find yourself in a situation in which
you have to migrate your data e.g. because your data modeling has changed.

Generate a data migration file:

```sh
# in backend
$ yarn run db:migrate:create your_data_migration
# Edit the file in ./src/db/migrations/

# for docker
# in main folder while docker compose is running
$ docker compose exec ocelot-social-backend-1 yarn run db:migrate:create your_data_migration
# Edit the file in ./src/db/migrations/
```

To run the migration:

```sh
# in backend/ while database is running
$ yarn run db:migrate up

# for docker
# in main folder while docker compose is running
$ docker exec backend yarn run db:migrate up
```

## Testing

**Beware**: We have no multiple database setup at the moment. We clean the
database after each test, running the tests will wipe out all your data!

Run the unit tests:

```sh
# in backend/ while database is running
$ yarn run test

# for docker
# in main folder while docker compose is running
$ docker exec ocelot-social-backend-1 yarn run test
```

If the snapshots of the emails must be updated, you have to run the tests in docker! Otherwise the CI will fail.

```sh
# in main folder while docker compose is running
$ docker exec ocelot-social-backend-1 yarn run test -u src/emails/
```
