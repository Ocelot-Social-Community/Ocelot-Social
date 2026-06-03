import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I enable the policy {string}', (key) => {
  cy.get(`[data-test="policy-${key}"]`).check()
})
