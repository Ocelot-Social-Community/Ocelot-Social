import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see a button with the label {string}', label => {
  cy.contains('button', label)
})
