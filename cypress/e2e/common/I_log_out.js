import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I log out", () => {
  cy.get(".avatar-menu")
    .click();
  cy.get(".avatar-menu-popover")
    .find('a[href="/logout"]')
    .click();
});
