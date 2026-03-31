import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../commands'
import './../../factories'

const createGroupRoomMutation = `
  mutation ($groupId: ID!) {
    CreateGroupRoom(groupId: $groupId) {
      id
    }
  }
`

defineStep('{string} opens the group chat for {string}', (userSlug, groupId) => {
  cy.neode()
    .then((neode) => {
      return neode.cypher(
        `MATCH (user:User {slug: $userSlug})-[:PRIMARY_EMAIL]->(e:EmailAddress)
         RETURN e.email AS email`,
        { userSlug },
      )
    })
    .then((result) => {
      const email = result.records[0].get('email')
      const password = (Cypress.env('userPasswords') || {})[userSlug] || '1234'
      return cy.authenticateAs({ email, password }).then((client) => {
        return client.request(createGroupRoomMutation, { groupId })
      })
    })
})
