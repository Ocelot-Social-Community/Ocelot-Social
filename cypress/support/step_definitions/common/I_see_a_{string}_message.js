import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see a {string} message:', (_type, message) => {
  cy.contains(message)
})
