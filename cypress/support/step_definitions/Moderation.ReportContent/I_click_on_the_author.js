import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I click on the author', () => {
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get('[data-test="avatarUserLink"]')
    .click()
    .url().should('include', '/profile/')
})
