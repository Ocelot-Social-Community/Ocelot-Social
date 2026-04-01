import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I generate a new invite code', () => {
  cy.get('.generate-invite-code').click()
})
