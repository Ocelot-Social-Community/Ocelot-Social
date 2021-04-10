import { Given } from "cypress-cucumber-preprocessor/steps";

Given("I navigate to page {string}", page => {
  if (page === "landing") {
    page = "";
  }
  cy.visit(`/${page}`);
});