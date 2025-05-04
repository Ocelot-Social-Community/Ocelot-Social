import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click save', () => {
  cy.get('.save-button').click()
})
