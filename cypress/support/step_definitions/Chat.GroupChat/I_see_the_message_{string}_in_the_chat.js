import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the message {string} in the chat', (message) => {
  cy.get('.vac-message-wrapper', { timeout: 15000 }).should('contain', message)
})
