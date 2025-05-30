import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should not see posts without the searched-for term in the select dropdown', () => {
  cy.get('.ds-select-dropdown')
    .should('not.contain','No searched for content')
})
