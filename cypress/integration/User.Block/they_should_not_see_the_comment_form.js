import { Then } from "cypress-cucumber-preprocessor/steps";

Then("they should not see the comment form", () => {
  cy.get(".base-card").children().should('not.have.class', 'comment-form')
})