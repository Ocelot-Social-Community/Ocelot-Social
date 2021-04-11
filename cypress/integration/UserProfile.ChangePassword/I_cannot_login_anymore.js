import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I cannot login anymore", password => {
  //cy.reload();
  cy.get(".iziToast-wrapper")
    .should("contain", "Incorrect email address or password.");
});