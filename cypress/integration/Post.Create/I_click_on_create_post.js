import { When } from "cypress-cucumber-preprocessor/steps";

When("I click on create post", () => {
  cy.get(".post-add-button").click();
});