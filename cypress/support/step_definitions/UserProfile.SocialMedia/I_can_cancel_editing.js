import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('I can cancel editing', () => {
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get('button#cancel')
    .click()
    .get('input#editSocialMedia')
    .should('have.length', 0)
})
