import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("my comment should be successfully created", () => {
  cy.get(".iziToast-message").contains("Comment submitted!");
});
