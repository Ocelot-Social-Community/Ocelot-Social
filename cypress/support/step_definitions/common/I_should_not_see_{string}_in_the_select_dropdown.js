import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Only meaningful after a positive assertion or `I search for`, which waits for the results —
// otherwise it passes against the dropdown before the results arrive.
defineStep('I should not see {string} in the select dropdown', (text) => {
  cy.get('.searchable-input .ds-select-dropdown').should('not.contain', text)
})
