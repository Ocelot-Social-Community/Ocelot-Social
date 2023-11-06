# GraphQL Playground

![GraphQL Playground](../../../.gitbook/assets/graphql-playground%20%281%29.png)

[![Build Status Test](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions/workflows/test.yml/badge.svgTEST)](https://github.com/Ocelot-Social-Community/Ocelot-Social/actions)

***Attention:** For using the GraphQL Playground set `DEBUG=true` in your backend `.env`, see `.env.template`!*

To use GraphQL Playground, we need to know some basics:

## How To Login?

First, we need to have a user from ocelot.social to log in as.
The user can be created by seeding the Neo4j database from the backend or by multiple GraphQL mutations.

### Seed The Neo4j Database

In your browser you can reach the GraphQL Playground under `http://localhost:4000/`, if the database and the backend are running, see [backend](../../README.md).
There you will also find instructions on how to seed the database.

### Use GraphQL Mutations To Create A User

TODO: Describe how to create a user using GraphQL mutations!

### Login Via GraphQL

You can register a user by sending the query:

```gql
mutation {
  login(email: "user@example.org", password: "1234")
}
```

Or use `"moderator@example.org"` or `"admin@example.org"` for the roll you need.

If all goes well, you will receive a QGL response like:

```json
{
  "data": {
    "login": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InUzIiwibmFtZSI6Ikplbm55IFJvc3RvY2siLCJzbHVnIjoiamVubnktcm9zdG9jayIsImlhdCI6MTY2MjAyMzMwNSwiZXhwIjoxNzI1MTM4NTA1LCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjQwMDAiLCJzdWIiOiJ1MyJ9.atBS-SOeS784HPeFl_5s8sRWehEAU1BkgcOZFD8d4bU"
  }
}
```

You can use this response to set an HTTP header when you click `HTTP HEADERS` in the footer.
Just set it with the login token you received in response:

```json
{
  "Authorization": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InUzIiwibmFtZSI6Ikplbm55IFJvc3RvY2siLCJzbHVnIjoiamVubnktcm9zdG9jayIsImlhdCI6MTY2MjAyMzMwNSwiZXhwIjoxNzI1MTM4NTA1LCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjQwMDAiLCJzdWIiOiJ1MyJ9.atBS-SOeS784HPeFl_5s8sRWehEAU1BkgcOZFD8d4bU"
}
```

This token is used for all other queries and mutations you send to the backend.

## Query And Mutate

When you are logged in and open a new playground tab by clicking "+", you can create a new group by sending the following mutation:

```gql
mutation {
  CreateGroup(
    # id: ""
    name: "My Group"
    # slug: ""
    about: "We will save the world"
    description: "<p class=\"\"><em>English:</em></p><p class=\"\">This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br></p><p><em>Deutsch:</em></p><p class=\"\">Diese Gruppe ist verborgen.</p><h3>Wofür ist unsere Gruppe?</h3><p class=\"\">Diese Gruppe wurde geschaffen, um investigativen Journalisten den Austausch und die Zusammenarbeit zu ermöglichen.</p><h3>Wie funktioniert das?</h3><p class=\"\">Hier könnt ihr euch intern über Beiträge und Kommentare zu ihnen austauschen.</p>"
    groupType: hidden
    actionRadius: interplanetary
    categoryIds: ["cat12"]
  ) {
    id
    name
    slug
    createdAt
    updatedAt
    disabled
    deleted
    about
    description
    groupType
    actionRadius
    myRole
  }
}
```

You will receive the answer:

```json
{
  "data": {
    "CreateGroup": {
      "id": "2e3bbadb-804b-4ebc-a673-2d7c7f05e827",
      "name": "My Group",
      "slug": "my-group",
      "createdAt": "2022-09-01T09:44:47.969Z",
      "updatedAt": "2022-09-01T09:44:47.969Z",
      "disabled": false,
      "deleted": false,
      "about": "We will save the world",
      "description": "<p class=\"\"><em>English:</em></p><p class=\"\">This group is hidden.</p><h3>What is our group for?</h3><p>This group was created to allow investigative journalists to share and collaborate.</p><h3>How does it work?</h3><p>Here you can internally share posts and comments about them.</p><p><br></p><p><em>Deutsch:</em></p><p class=\"\">Diese Gruppe ist verborgen.</p><h3>Wofür ist unsere Gruppe?</h3><p class=\"\">Diese Gruppe wurde geschaffen, um investigativen Journalisten den Austausch und die Zusammenarbeit zu ermöglichen.</p><h3>Wie funktioniert das?</h3><p class=\"\">Hier könnt ihr euch intern über Beiträge und Kommentare zu ihnen austauschen.</p>",
      "groupType": "hidden",
      "actionRadius": "interplanetary",
      "myRole": "owner"
    }
  }
}
```

If you look into the Neo4j database with your browser and search the groups, you will now also find your new group.
For more details about our Neo4j database read [here](../../../neo4j/README.md).
