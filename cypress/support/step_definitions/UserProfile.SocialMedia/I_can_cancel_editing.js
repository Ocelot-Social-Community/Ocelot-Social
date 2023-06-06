import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('I can cancel editing', () => {
  cy.get('button#cancel')
    .click()
    .get('input#editSocialMedia')
    .should('have.length', 0)
})
