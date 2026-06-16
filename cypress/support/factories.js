import Factory, { cleanDatabase } from '../../backend/build/src/db/factories'
import { getNeode } from '../../backend/build/src/db/neo4j'
import CONFIG from '../../backend/build/src/config'

const neodeInstance = getNeode()

// Wipe the DB before each test AND re-seed the default Role nodes. The single-role
// model resolves authorization from a (:User)-[:HAS_ROLE]->(:Role) edge, which the
// factory creates via relateUserToRole — but only if the target Role node exists.
// A bare DETACH DELETE removed the boot-seeded Role nodes, so factory-built admins/
// moderators ended up with no edge (→ USER_ROLE → 403 on admin/moderation routes).
// cleanDatabase() deletes everything (except Migration nodes) and re-seeds the roles.
//
// The DB wipe runs in this (test) process, but the running server keeps its in-memory
// role/policy caches — so a custom role a previous scenario created would linger and
// e.g. break a "create that role" flow with "already exists". After the wipe we nudge
// the server to resync its caches from the fresh DB (resyncCaches needs no auth outside
// production). failOnStatusCode:false so a transient server hiccup never fails setup.
beforeEach(() => {
  cy.then(() => cleanDatabase())
  cy.request({
    method: 'POST',
    url: CONFIG.GRAPHQL_URI,
    body: { query: 'mutation { resyncCaches }' },
    failOnStatusCode: false,
  })
})

Cypress.Commands.add('neode', () => {
  return neodeInstance
})

Cypress.Commands.add(
  'firstOf',
  { prevSubject: true },
  (neode, model, properties) => {
    return neode.first(model, properties)
  }
)
Cypress.Commands.add(
  'relateTo',
  { prevSubject: true },
  (node, otherNode, relationship) => {
    return node.relateTo(otherNode, relationship)
  }
)

Cypress.Commands.add('factory', () => Factory)

Cypress.Commands.add(
  'build',
  { prevSubject: true },
  (factory, name, atrributes, options) => {
    return new Cypress.Promise((resolve, reject) => {
      return factory.build(name, atrributes, options).then(() => resolve(factory))
    })
  }
)

