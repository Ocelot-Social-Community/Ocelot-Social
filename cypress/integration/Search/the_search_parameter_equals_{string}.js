import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the search parameter equals {string}", search => {
  cy.location("search")
    .should("eq", search);
});
