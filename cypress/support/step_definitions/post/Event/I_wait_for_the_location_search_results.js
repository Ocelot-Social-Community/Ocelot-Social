import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Waits for at least one option to appear in the location dropdown instead of
// using a fixed-time delay. Fails fast with a clear message if the query mock
// never fires or the Apollo result never renders.
defineStep('I wait for the location search results', () => {
  cy.get('.ds-select-option', { timeout: 10000 }).should('exist')
})
