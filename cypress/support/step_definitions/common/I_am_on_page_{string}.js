import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I am on page {string}", page => {
  cy.location("pathname")
    .should("match", new RegExp(page));
});
