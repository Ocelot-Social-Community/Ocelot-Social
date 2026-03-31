import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../commands'
import './../../factories'

const createMessageMutation = `
  mutation ($userId: ID, $content: String) {
    CreateMessage(userId: $userId, content: $content) {
      id
    }
  }
`

defineStep(
  '{string} sends a chat message {string} to {string}',
  (senderSlug, message, recipientSlug) => {
    cy.neode()
      .then((neode) => {
        return neode.cypher(
          `MATCH (sender:User {slug: $senderSlug})-[:PRIMARY_EMAIL]->(e:EmailAddress)
           MATCH (recipient:User {slug: $recipientSlug})
           RETURN e.email AS senderEmail, recipient.id AS recipientId`,
          { senderSlug, recipientSlug },
        )
      })
      .then((result) => {
        expect(result.records).to.have.length.greaterThan(0,
          `No users found for sender "${senderSlug}" or recipient "${recipientSlug}"`)
        const senderEmail = result.records[0].get('senderEmail')
        const recipientId = result.records[0].get('recipientId')
        const password = (Cypress.env('userPasswords') || {})[senderSlug] || '1234'
        return cy.authenticateAs({ email: senderEmail, password }).then((client) => {
          return client.request(createMessageMutation, { userId: recipientId, content: message })
        })
      })
  },
)
