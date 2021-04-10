import { When } from "cypress-cucumber-preprocessor/steps";

When("I click submit", () => {
  cy.get("button[name=submit]")
    .click();
});