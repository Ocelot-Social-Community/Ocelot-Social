import { When } from "cypress-cucumber-preprocessor/steps";

When("I type {string} and press escape", value => {
  cy.get(".searchable-input .ds-select input")
    .focus()
    .type(value)
    .type("{esc}");
});