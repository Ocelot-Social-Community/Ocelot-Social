import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I am on page {string}", page => {
  cy.location("pathname")
    .should("contain", page.replace("...", ""));
});