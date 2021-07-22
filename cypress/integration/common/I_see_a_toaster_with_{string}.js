import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I see a toaster with {string}", (title) => {
  cy.get(".iziToast-message").should("contain", title);
})