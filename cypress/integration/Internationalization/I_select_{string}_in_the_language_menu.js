import { When } from "cypress-cucumber-preprocessor/steps";

When("I select {string} in the language menu", language => {
    cy.get(".locale-menu")
      .click();
    cy.contains(".locale-menu-popover a", language)
      .click();
});