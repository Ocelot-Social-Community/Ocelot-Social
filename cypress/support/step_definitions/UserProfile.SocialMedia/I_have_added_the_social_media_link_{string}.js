import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given('I have added the social media link {string}', (link) => {
  cy.visit('/settings/my-social-media')
    .get('[data-test="add-save-button"]')
    .click()
    .get('#editSocialMedia')
    .type(link)
    .get('[data-test="add-save-button"]')
    .click()
  cy.get('.ds-list-item-content > a')
    .contains(link)
})
