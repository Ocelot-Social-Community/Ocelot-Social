import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the notification menu button links to the all notifications page", () => {
  cy.get(".notifications-menu")
    .click();
  cy.location("pathname")
    .should("contain", "/notifications");
});