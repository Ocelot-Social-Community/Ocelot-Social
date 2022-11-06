import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given("I navigate to page {string}", page => {
  cy.visit(page);
});
