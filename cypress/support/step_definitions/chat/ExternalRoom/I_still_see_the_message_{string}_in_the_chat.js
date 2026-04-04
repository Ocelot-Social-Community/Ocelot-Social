import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I still see the message {string} in the chat', (message) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('.vac-message-wrapper', { timeout: 10000 })
    .should('contain', message)
})
