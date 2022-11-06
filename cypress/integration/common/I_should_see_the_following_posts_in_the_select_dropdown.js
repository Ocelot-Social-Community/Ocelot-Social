import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should see the following posts in the select dropdown:", table => {
  table.hashes().forEach(({ title }) => {
    cy.get(".ds-select-dropdown")
      .should("contain", title);
  });
});
