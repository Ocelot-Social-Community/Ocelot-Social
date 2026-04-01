import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see the {string} button', button => {
  cy.get('.os-card .action-buttons button')
    .should('contain', button)
})
