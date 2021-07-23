import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I see a button with the label {string}", label => {
  cy.contains("button", label);
});