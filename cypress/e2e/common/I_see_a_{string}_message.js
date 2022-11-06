import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I see a {string} message:", (_type, message) => {
  cy.contains(message);
});
