import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I confirm the action in the modal', () => {
  cy.get('[data-test="confirm-modal"]').should('be.visible')
  cy.get('[data-test="confirm-button"]').click()
})
