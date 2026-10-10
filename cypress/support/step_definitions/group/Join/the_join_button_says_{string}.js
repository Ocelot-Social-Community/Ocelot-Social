import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the join button says {string}', (label) => {
  cy.get('[data-test="join-leave-btn"]', { timeout: 15000 }).should('contain', label)
})
