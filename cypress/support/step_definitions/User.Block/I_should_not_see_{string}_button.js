import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should not see {string} button', button => {
  cy.get('.base-card .action-buttons')
    .should('have.length', 1)
})
