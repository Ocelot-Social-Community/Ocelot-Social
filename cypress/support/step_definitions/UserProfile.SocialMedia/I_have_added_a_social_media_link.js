import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I have added a social media link', () => {
  cy.visit('/settings/my-social-media')
    .get('button')
    .contains('Add link')
    .click()
    .get('#editSocialMedia')
    .type('https://freeradical.zone/peter-pan')
    .get('button')
    .contains('Save')
    .click()
})
