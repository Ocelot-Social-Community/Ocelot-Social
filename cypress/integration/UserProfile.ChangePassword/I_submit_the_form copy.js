import { When } from "cypress-cucumber-preprocessor/steps";

When("I submit the form", () => {
  cy.get("form").submit();
});