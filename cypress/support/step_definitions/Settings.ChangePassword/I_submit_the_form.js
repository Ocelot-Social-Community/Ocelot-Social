import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I submit the form', () => {
  cy.get('form').submit()
})
