import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I see a button with the label {string}", label => {
  cy.contains("button", label);
});
