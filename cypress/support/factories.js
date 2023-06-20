import Factory from '../../backend/build/db/factories'
import { getNeode } from '../../backend/build/db/neo4j'

const neodeInstance = getNeode()

beforeEach(() => cy.then(() => neodeInstance.writeCypher('MATCH (everything) DETACH DELETE everything;')))

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

