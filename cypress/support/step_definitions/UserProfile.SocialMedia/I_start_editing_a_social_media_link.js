import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I start editing a social media link', () => {
  cy.get('[data-test="edit-button"]')
    .click()
})
