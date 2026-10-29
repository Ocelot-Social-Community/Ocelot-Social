import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I clear the search field', () => {
  cy.get('.searchable-input .ds-select input').focus().type('{esc}')
  cy.get('.searchable-input .ds-select-placeholder').should('be.visible')
  cy.get('.searchable-input .ds-select input').should('have.value', '')
})
