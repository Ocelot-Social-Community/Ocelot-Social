import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I see a {string} message:", (type, message) => {
  cy.contains(message);
});