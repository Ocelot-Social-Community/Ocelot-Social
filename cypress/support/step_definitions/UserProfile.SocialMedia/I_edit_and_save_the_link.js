import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I edit and save the link', () => {
  cy.get('input#editSocialMedia')
    .clear()
    .type('https://freeradical.zone/tinkerbell')
    .get('[data-test="add-save-button"]')
    .click()
})
