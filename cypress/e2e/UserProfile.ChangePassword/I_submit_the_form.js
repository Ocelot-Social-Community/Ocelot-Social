import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I submit the form", () => {
  cy.get("form").submit();
});
