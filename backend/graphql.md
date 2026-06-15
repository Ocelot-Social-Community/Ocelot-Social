# GraphQL with Apollo

GraphQL is a data query language which provides an alternative to REST and ad-hoc web service architectures. It allows clients to define the structure of the data required, and exactly the same structure of the data is returned from the server.

We have a closer description for the [GraphQL Playground](./src/graphql/GraphQL-Playground.md).

![GraphQL Playground](../.gitbook/assets/graphql-playground%20%281%29.png)

## Middleware keeps resolvers clean

![Middleware schema](../.gitbook/assets/grafik-4.png)

A well-organized codebase is key for the ability to maintain and easily introduce changes into an app. Figuring out the right structure for your code remains a continuous challenge - especially as an application grows and more developers are joining a project.

A common problem in GraphQL servers is that resolvers often get cluttered with business logic, making the entire resolver system harder to understand and maintain.

GraphQL Middleware uses the [_middleware pattern_](https://dzone.com/articles/understanding-middleware-pattern-in-expressjs) \(well-known from Express.js\) to pull out repetitive code from resolvers and execute it before or after one of your resolvers is invoked. This improves code modularity and keeps your resolvers clean and simple.

## API reference documentation

The GraphQL API has a generated, browsable HTML reference. There are two
audiences and two ways to consume it:

### For developers: explore the live API

Run the backend (`yarn dev`) and open the GraphQL endpoint
(`GRAPHQL_URI`, default `http://localhost:4000/`) in a browser to get an
interactive playground/sandbox where you can run queries against your data. See
the [GraphQL Playground notes](./src/graphql/GraphQL-Playground.md).

### For users: static HTML reference (SpectaQL)

A self-contained HTML page is generated with
[SpectaQL](https://github.com/anvilco/spectaql):

```sh
yarn docs:api
# → backend/public-docs/index.html  (open in a browser)
```

`docs:api` runs two steps:

1. **`yarn schema:print`** writes `backend/schema.graphql` — the **augmented**
   runtime schema. This matters: `neo4j-graphql-js`'s `makeAugmentedSchema`
   generates queries, `filter`/`orderBy` arguments and CRUD mutations that do
   **not** exist in the hand-written `src/graphql/**/*.gql` files. Introspecting
   the built schema (rather than the SDL files) is therefore the only complete
   source of truth. The print runs without a Neo4j connection, so it works in CI.
2. **`spectaql spectaql.yml`** renders the SDL into static HTML under
   `public-docs/` (git-ignored). Configure title, intro and endpoint in
   [`spectaql.yml`](./spectaql.yml).

Both `schema.graphql` and `public-docs/` are git-ignored build artifacts —
`docs:api` regenerates `schema.graphql` on every run, so it never needs to be
committed.

### CI

The [`docs-api` workflow](../.github/workflows/docs-api.yml) builds the HTML on
every backend change and uploads it as the `graphql-api-docs` artifact (download
it from the workflow run). Hosting is intentionally not wired up yet — the docs
could later be embedded into `docs.ocelot.social` if desired.


