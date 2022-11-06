import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("see {int} unread notifications in the top menu", count => {
  cy.get(".notifications-menu")
    .should("contain", count);
});
