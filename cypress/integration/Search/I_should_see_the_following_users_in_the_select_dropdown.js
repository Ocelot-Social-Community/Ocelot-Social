import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I should see the following users in the select dropdown:", table => {
  cy.get(".search-heading").should("contain", "Users");
  table.hashes().forEach(({ slug }) => {
    cy.get(".ds-select-dropdown").should("contain", slug);
  });
});