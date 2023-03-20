import { When } from "cypress-cucumber-preprocessor/steps";

When('I add a social media link', () => {
  cy.get('[data-test="add-save-button"]')
    .click()
    .get('#editSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get('[data-test="add-save-button"]')
    .click()
})