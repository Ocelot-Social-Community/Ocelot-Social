import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I am logged in as {string}", name => {
  cy.get(".avatar-menu").click();
  cy.get(".avatar-menu-popover").contains(name);
});