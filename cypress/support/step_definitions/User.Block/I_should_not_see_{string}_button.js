import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('I should not see {string} button', button => {
  cy.get('.base-card .action-buttons')
    .should('have.length', 1)
})
