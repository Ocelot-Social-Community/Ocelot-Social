import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click the join button', () => {
  cy.get('[data-test="join-leave-btn"]').click()
})
