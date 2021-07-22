import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I can cancel editing', () => {
  cy.get('button#cancel')
    .click()
    .get('input#editSocialMedia')
    .should('have.length', 0)
})