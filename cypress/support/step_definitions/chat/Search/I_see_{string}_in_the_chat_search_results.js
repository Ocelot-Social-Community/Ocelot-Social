import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see {string} in the chat search results', (name) => {
  cy.get('.chat-search-result-name', { timeout: 10000 }).should('contain', name)
})
