import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I search for {string} in the chat search', (query) => {
  cy.get('input#chat-search-combined', { timeout: 10000 }).type(query)
})
