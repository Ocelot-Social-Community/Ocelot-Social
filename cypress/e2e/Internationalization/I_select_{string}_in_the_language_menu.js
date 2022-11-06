import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I select {string} in the language menu", language => {
    cy.get(".locale-menu")
      .click();
    cy.contains(".locale-menu-popover a", language)
      .click();
});
