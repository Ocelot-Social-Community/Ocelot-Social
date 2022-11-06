import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the unread counter is removed", () => {
  cy.get('.notifications-menu .counter-icon')
    .should('not.exist');
});
