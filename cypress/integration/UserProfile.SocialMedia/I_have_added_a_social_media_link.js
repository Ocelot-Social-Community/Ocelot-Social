import { Given } from "cypress-cucumber-preprocessor/steps";

Given('I have added a social media link', () => {
  cy.visit('/settings/my-social-media')
    .get('input#addSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get('button')
    .contains('Add link')
    .click()
})