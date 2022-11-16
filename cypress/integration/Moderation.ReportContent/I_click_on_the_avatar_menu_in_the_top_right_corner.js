import { When } from "cypress-cucumber-preprocessor/steps";

When("I click on the avatar menu in the top right corner", () => {
  cy.get(".avatar-menu").click();
});