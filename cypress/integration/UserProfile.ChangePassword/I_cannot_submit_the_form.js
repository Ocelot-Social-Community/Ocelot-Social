import { When } from "cypress-cucumber-preprocessor/steps";

When("I cannot submit the form", () => {
  cy.get("button[type=submit]")
    .should('be.disabled');
});