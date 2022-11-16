import { When } from "cypress-cucumber-preprocessor/steps";

When("I log out", () => {
  cy.get(".avatar-menu")
    .click();
  cy.get(".avatar-menu-popover")
    .find('a[href="/logout"]')
    .click();
});