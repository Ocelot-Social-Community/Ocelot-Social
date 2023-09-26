import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("they should see a text explaining why commenting is not possible", () => {
  cy.get('.ds-placeholder').should('contain', "Commenting is not possible at this time on this post.")
})
