import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Closed, the select shows its placeholder instead of the input; the input keeps the old text
// until the select opens again and resets it (OcelotSelect autoResetSearch).
defineStep('the search field should clear', () => {
  cy.get('.searchable-input .ds-select-placeholder').should('be.visible')
  cy.get('.searchable-input .ds-select input').focus().should('have.value', '')
})
