import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../commands'
import './../../factories'

const createRoomMutation = `
  mutation ($userId: ID!) {
    CreateRoom(userId: $userId) {
      id
    }
  }
`

const createMessageMutation = `
  mutation ($roomId: ID!, $content: String) {
    CreateMessage(roomId: $roomId, content: $content) {
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
        const senderEmail = result.records[0].get('senderEmail')
        const recipientId = result.records[0].get('recipientId')
        cy.authenticateAs({ email: senderEmail, password: '1234' }).then((client) => {
          client.request(createRoomMutation, { userId: recipientId }).then((roomData) => {
            const roomId = roomData.CreateRoom.id
            client.request(createMessageMutation, { roomId, content: message })
          })
        })
      })
  },
)
