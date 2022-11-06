import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I can login successfully", () => {
  // cy.reload();
  cy.get(".iziToast-wrapper")
     .should("contain", "You are logged in!");
});
