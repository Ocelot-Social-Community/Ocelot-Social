import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I can login successfully", () => {
  // cy.reload();
  cy.get(".iziToast-wrapper")
     .should("contain", "You are logged in!");
});