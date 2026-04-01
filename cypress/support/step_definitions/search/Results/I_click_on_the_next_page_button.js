import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the next page button', () => {
  cy.get('[data-test="next-button"]').first().click()
})
