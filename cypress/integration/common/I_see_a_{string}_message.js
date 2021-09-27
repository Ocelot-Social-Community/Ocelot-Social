import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I see a {string} message:", (_type, message) => {
  cy.contains(message);
});