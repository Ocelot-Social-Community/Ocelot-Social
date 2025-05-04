import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see the {string} button', button => {
  cy.get('.base-card .action-buttons .base-button')
    .should('contain', button)
})
