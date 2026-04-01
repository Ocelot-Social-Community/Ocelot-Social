import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I invalidate the first invite code', () => {
  cy.get('.invitation .invalidate-button').first().click()
})
