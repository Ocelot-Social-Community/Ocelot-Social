import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I click on the avatar menu in the top right corner", () => {
  cy.get(".avatar-menu").click();
});
