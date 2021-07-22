import { Then } from "cypress-cucumber-preprocessor/steps";

Then("my comment should be successfully created", () => {
  cy.get(".iziToast-message").contains("Comment submitted!");
});