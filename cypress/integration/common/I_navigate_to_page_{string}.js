import { Given } from "cypress-cucumber-preprocessor/steps";

Given("I navigate to page {string}", page => {
  cy.visit(page);
});