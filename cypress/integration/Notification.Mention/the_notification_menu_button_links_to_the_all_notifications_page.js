import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the notification menu button links to the all notifications page", () => {
  cy.get(".notifications-menu")
    .click();
  cy.location("pathname")
    .should("contain", "/notifications");
});
