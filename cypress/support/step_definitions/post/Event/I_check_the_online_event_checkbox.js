import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I check the online event checkbox', () => {
  cy.get('input[name="eventIsOnline"]').check()
})
