import { When } from "cypress-cucumber-preprocessor/steps";

When("I search for {string}", value => {
  cy.get(".searchable-input .ds-select input")
    .focus()
    .type(value)
    .wait(750);
});