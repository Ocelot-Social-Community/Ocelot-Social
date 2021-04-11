import { When } from "cypress-cucumber-preprocessor/steps";

When("I search for {string}", postTitle => {
  cy.get(".searchable-input .ds-select input")
    .focus()
    .type(postTitle);
});