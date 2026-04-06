import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see a group icon before {string} in the room list', (name) => {
  // Group room info slots are in the light DOM
  cy.get('vue-advanced-chat .room-name-with-icon', { timeout: 15000 })
    .contains(name)
    .parent()
    .find('.room-group-icon')
    .should('exist')
})
