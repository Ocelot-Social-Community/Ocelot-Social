import { When } from "cypress-cucumber-preprocessor/steps";

When("I visit the {string} page", page => {
  cy.openPage(page);
});