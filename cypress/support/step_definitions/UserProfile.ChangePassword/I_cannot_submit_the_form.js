import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I cannot submit the form', () => {
  cy.get('button[type=submit]')
    .should('be.disabled')
})
