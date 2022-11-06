import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I type {string} and press Enter", value => {
  cy.get(".searchable-input .ds-select input")
    .focus()
    .type(value)
    .type("{enter}", { force: true });
});
