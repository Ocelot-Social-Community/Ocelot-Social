import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I am on page {string}', page => {
  cy.location('pathname')
    .should('match', new RegExp(page))
})
