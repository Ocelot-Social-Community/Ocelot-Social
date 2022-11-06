import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the search field should clear", () => {
  cy.get(".searchable-input .ds-select input")
    .should("have.text", "");
});
