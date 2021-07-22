import { When } from "cypress-cucumber-preprocessor/steps";

When('I edit and save the link', () => {
  cy.get('input#editSocialMedia')
    .clear()
    .type('https://freeradical.zone/tinkerbell')
    .get('button')
    .contains('Save')
    .click()
})