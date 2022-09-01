# GraphQL Playground

To use the GraphQL Playground we have to know some basics:

## How To Login?

At first we have to have a user of ocelot.social as whom we can login.
The user can be created by seeding the Neo4j database from the backend or by several GraphQL mutations.

### Seed The Neo4j Database

In your browser you reach the GraphQL Playground under `http://localhost:4000/`
if the database and the backend is running, see [backend](../../backend/README.md).
You can find how to seed there as well.

### Use GraphQL Mutations To Create A User

TODO: Describe how to create a user by GraphQL mutations!

### Login Via GraphQL

You can login by sending the query:

```gql
mutation ($email: String!, $password: String!) {
  login(email: $email, password: $password)
}
```
