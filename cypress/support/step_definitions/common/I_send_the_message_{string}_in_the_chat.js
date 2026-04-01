import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I send the message {string} in the chat', (message) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-textarea')
    .should('be.visible')
    .type(`${message}{enter}`)
})
