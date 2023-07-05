import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("they should not see the comment form", () => {
  cy.get(".base-card").children().should('not.have.class', 'comment-form')
})
