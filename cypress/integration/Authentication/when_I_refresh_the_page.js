import { When } from "cypress-cucumber-preprocessor/steps";

When('I refresh the page', () => {
  cy.visit('/')
    .reload();
});