import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see the {string} tab as active', (type) => {
  cy.get(`[data-test="${type}-tab"]`).should('have.class', '--active')
})
