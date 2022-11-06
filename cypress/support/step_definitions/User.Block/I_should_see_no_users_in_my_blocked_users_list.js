import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should see no users in my blocked users list", () => {
  cy.get('.ds-placeholder')
    .should('contain', "So far, you have not blocked anybody.")
})
