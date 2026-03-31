import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the room {string}', (roomName) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .contains('.vac-room-name', roomName, { timeout: 15000 })
    .click()
})
