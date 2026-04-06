import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see {string} in the room list', (name) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-room-item', { timeout: 10000 })
    .contains(name)
    .should('be.visible')
})

defineStep('I do not see {string} in the room list', (name) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-room-item', { timeout: 10000 })
    .contains(name)
    .should('not.exist')
})
