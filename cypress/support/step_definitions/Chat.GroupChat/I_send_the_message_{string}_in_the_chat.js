import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I send the message {string} in the chat', (message) => {
  cy.get('.vac-textarea', { timeout: 15000 }).should('be.visible').type(`${message}{enter}`)
})
