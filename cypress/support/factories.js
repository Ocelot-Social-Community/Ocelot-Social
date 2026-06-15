import Factory, { cleanDatabase } from '../../backend/build/src/db/factories'
import { getNeode } from '../../backend/build/src/db/neo4j'

const neodeInstance = getNeode()

// Wipe the DB before each test AND re-seed the default Role nodes. The single-role
// model resolves authorization from a (:User)-[:HAS_ROLE]->(:Role) edge, which the
// factory creates via relateUserToRole — but only if the target Role node exists.
// A bare DETACH DELETE removed the boot-seeded Role nodes, so factory-built admins/
// moderators ended up with no edge (→ USER_ROLE → 403 on admin/moderation routes).
// cleanDatabase() deletes everything (except Migration nodes) and re-seeds the roles.
beforeEach(() => cy.then(() => cleanDatabase()))

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

