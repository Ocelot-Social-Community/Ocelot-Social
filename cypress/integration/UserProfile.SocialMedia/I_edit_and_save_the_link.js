import { When } from "@badeball/cypress-cucumber-preprocessor";

When('I edit and save the link', () => {
  cy.get('input#editSocialMedia')
    .clear()
    .type('https://freeradical.zone/tinkerbell')
    .get('button')
    .contains('Save')
    .click()
})
