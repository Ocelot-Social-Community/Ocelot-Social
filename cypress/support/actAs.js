import './commands'
import './factories'

// Runs a GraphQL operation as another user, through the real API: the resolvers and their
// middleware run, so it notifies whom it notifies in the network. The factories write straight to
// the database and notify nobody — fine for what a scenario starts from, not for what it tests.
//
// The user must come from a "users" table with a password (see the_following_{string}_are_in_the_database).
export const actAs = (slug, operation, variables) =>
  cy
    .fixtures()
    .then((fixtures) =>
      fixtures.cypher(
        `MATCH (user:User {slug: $slug})-[:PRIMARY_EMAIL]->(email:EmailAddress)
         RETURN email.email AS email`,
        { slug },
      ),
    )
    .then((result) => {
      expect(result.records, `the user "${slug}" with an e-mail address`).to.have.length(1)
      const email = result.records[0].get('email')
      const password = (Cypress.expose('userPasswords') || {})[slug]
      expect(password, `the password of "${slug}"`).to.exist
      return cy.authenticateAs({ email, password })
    })
    .then((client) => client.request(operation, variables))

// The id of the post with this title, for the operations that take one.
export const postIdOf = (title) =>
  cy
    .fixtures()
    .then((fixtures) =>
      fixtures.cypher('MATCH (post:Post {title: $title}) RETURN post.id AS id, post.slug AS slug', {
        title,
      }),
    )
    .then((result) => {
      expect(result.records, `the post "${title}"`).to.have.length(1)
      return { id: result.records[0].get('id'), slug: result.records[0].get('slug') }
    })
