import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the user chat button', () => {
  cy.get('[data-test="chat-btn"]', { timeout: 10000 }).click()
})
