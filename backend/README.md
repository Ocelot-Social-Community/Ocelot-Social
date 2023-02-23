# Backend

## Installation with Docker

Run the following command to install everything through docker.

The installation takes a bit longer on the first pass or on rebuild ...

```bash
# in main folder
$ docker-compose up
# or
# rebuild the containers for a cleanup
$ docker-compose up --build
```

Wait a little until your backend is up and running at [http://localhost:4000/](http://localhost:4000/).

## Installation without Docker

For the local installation you need a recent version of
[Node](https://nodejs.org/en/) (&gt;= `v16.19.0`). We are using
`v19.4.0` and therefore we recommend to use the same version
([see](https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4082)
some known problems with more recent node versions). You can use the
[node version manager](https://github.com/nvm-sh/nvm) `nvm` to switch
between different local Node versions:

```bash
# install Node
$ cd backend
$ nvm install v19.4.0
$ nvm use v19.4.0
```

Install node dependencies with [yarn](https://yarnpkg.com/en/):

```bash
# in main folder
$ cd backend
$ yarn install
# or just
$ yarn
# or just later on to use version of ".nvmrc" file
$ nvm use && yarn
```

Copy Environment Variables:

```bash
# in backend/
$ cp .env.template .env
```

Configure the new file according to your needs and your local setup. Make sure
a [local Neo4J](http://localhost:7474) instance is up and running.

Start the backend for development with:

```bash
# in backend/
$ yarn run dev
```

or start the backend in production environment with:

```bash
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

### Database Indices and Constraints

Database indices and constraints need to be created when the database and the
backend is running:

{% tabs %}
{% tab title="Docker" %}

```bash
# in main folder while docker-compose is running
$ docker exec backend yarn run db:migrate init
```

{% endtab %}
{% tab title="Without Docker" %}

```bash
# in folder backend/ while database is running
# make sure your database is running on http://localhost:7474/browser/
yarn run db:migrate init
```

{% endtab %}
{% endtabs %}

#### Seed Database

If you want your backend to return anything else than an empty response, you
need to seed your database:

{% tabs %}
{% tab title="Docker" %}

In another terminal run:

```bash
# in main folder while docker-compose is running
$ docker exec backend yarn run db:seed
```

To reset the database run:

```bash
# in main folder while docker-compose is running
$ docker exec backend yarn run db:reset
# you could also wipe out your neo4j database and delete all volumes with:
$ docker-compose down -v
# if container is not running, run this command to set up your database indeces and contstraints
$ docker exec backend yarn run db:migrate init
```

{% endtab %}
{% tab title="Without Docker" %}

Run:

```bash
# in backend/ while database is running
$ yarn run db:seed
```

To reset the database run:

```bash
# in backend/ while database is running
$ yarn run db:reset
```

{% endtab %}
{% endtabs %}

### Data migrations

Although Neo4J is schema-less,you might find yourself in a situation in which
you have to migrate your data e.g. because your data modeling has changed.

{% tabs %}
{% tab title="Docker" %}

Generate a data migration file:

```bash
# in main folder while docker-compose is running
$ docker-compose exec backend yarn run db:migrate:create your_data_migration
# Edit the file in ./src/db/migrations/
```

To run the migration:

```bash
# in main folder while docker-compose is running
$ docker exec backend yarn run db:migrate up
```

{% endtab %}
{% tab title="Without Docker" %}

Generate a data migration file:

```bash
# in backend/
$ yarn run db:migrate:create your_data_migration
# Edit the file in ./src/db/migrations/
```

To run the migration:

```bash
# in backend/ while database is running
$ yarn run db:migrate up
```

{% endtab %}
{% endtabs %}

## Testing

**Beware**: We have no multiple database setup at the moment. We clean the
database after each test, running the tests will wipe out all your data!

{% tabs %}
{% tab title="Docker" %}

Run the unit tests:

```bash
# in main folder while docker-compose is running
$ docker exec backend yarn run test
```

{% endtab %}

{% tab title="Without Docker" %}

Run the unit tests:

```bash
# in backend/ while database is running
$ yarn run test
```

{% endtab %}
{% endtabs %}
