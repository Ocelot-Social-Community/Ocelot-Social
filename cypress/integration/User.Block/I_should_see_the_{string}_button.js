import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I should see the {string} button', button => {
  cy.get('.base-card .action-buttons .base-button')
    .should('contain', button)
})