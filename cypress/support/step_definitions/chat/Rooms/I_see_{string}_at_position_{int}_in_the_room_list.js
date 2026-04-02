import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see {string} at position {int} in the room list', (roomName, position) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-room-item')
    .eq(position - 1)
    .find('.vac-room-name')
    .should('contain', roomName)
})
