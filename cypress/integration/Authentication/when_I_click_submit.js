import { When } from "cypress-cucumber-preprocessor/steps";

When("I click submit", () => {
  cy.get("button[name=submit]")
    .click()
    .wait(500); // This is to ensure we reach the feed
});