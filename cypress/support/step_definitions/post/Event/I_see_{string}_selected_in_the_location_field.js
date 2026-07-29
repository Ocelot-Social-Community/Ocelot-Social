import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Verifies that the OcelotSelect's value display shows the given text.
// After a successful selection the ds-select-value div renders the option label.
defineStep('I see {string} selected in the location field', (text) => {
  cy.get('.ds-select-value').should('contain', text)
})
