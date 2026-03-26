import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../commands'
import './../../factories'

const createGroupRoomMutation = `
  mutation ($groupId: ID!) {
    CreateGroupRoom(groupId: $groupId) {
      roomId
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
  '{string} sends a group chat message {string} to {string}',
  (senderSlug, message, groupId) => {
    cy.neode()
      .then((neode) => {
        return neode.cypher(
          `MATCH (sender:User {slug: $senderSlug})-[:PRIMARY_EMAIL]->(e:EmailAddress)
           RETURN e.email AS senderEmail`,
          { senderSlug },
        )
      })
      .then((result) => {
        const senderEmail = result.records[0].get('senderEmail')
        return cy.authenticateAs({ email: senderEmail, password: '1234' }).then((client) => {
          return client
            .request(createGroupRoomMutation, { groupId })
            .then((roomData) => {
              const roomId = roomData.CreateGroupRoom.roomId
              return client.request(createMessageMutation, { roomId, content: message })
            })
        })
      })
  },
)
