import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I cannot submit the form", () => {
  cy.get("button[type=submit]")
    .should('be.disabled');
});
