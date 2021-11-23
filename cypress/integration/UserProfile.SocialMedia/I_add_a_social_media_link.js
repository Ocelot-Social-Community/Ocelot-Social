import { When } from "cypress-cucumber-preprocessor/steps";

When('I add a social media link', () => {
  cy.get('button')
    .contains('Add link')
    .click()
    .get('#editSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get('button')
    .contains('Save')
    .click()
})