import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I add a social media link', () => {
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get('[data-test="add-save-button"]')
    .click()
    .get('#editSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get('[data-test="add-save-button"]')
    .click()
})
