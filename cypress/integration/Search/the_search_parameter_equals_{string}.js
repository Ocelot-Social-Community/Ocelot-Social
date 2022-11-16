import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the search parameter equals {string}", search => {
  cy.location("search")
    .should("eq", search);
});