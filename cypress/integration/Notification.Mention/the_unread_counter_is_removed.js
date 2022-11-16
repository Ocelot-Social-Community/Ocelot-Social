import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the unread counter is removed", () => {
  cy.get('.notifications-menu .counter-icon')
    .should('not.exist');
});