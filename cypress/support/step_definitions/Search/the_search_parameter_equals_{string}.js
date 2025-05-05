import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the search parameter equals {string}', search => {
  cy.location('search')
    .should('eq', search)
})
