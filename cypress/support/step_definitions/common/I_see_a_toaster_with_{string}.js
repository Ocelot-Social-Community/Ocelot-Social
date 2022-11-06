import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I see a toaster with {string}", (title) => {
  cy.get(".iziToast-message").should("contain", title);
})
