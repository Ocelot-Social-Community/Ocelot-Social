import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I select {string} from the chat search results', (name) => {
  cy.contains('.chat-search-result-name', name, { timeout: 10000 }).click()
})
