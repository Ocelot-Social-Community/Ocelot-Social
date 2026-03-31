import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see no chat search results', () => {
  cy.get('.chat-search-result-item').should('not.exist')
})
