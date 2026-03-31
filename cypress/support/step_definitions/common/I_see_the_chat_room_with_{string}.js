import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the chat room with {string}', (roomName) => {
  cy.get('vue-advanced-chat .vac-room-name', { timeout: 15000 }).should('contain', roomName)
})
