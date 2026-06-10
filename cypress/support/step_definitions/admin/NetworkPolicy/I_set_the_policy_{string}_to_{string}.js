import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Set an integer policy via its number input (clear the current value first so
// the typed value replaces it rather than appending). Sibling of the boolean
// "I enable the policy {string}" step which uses .check() on the checkbox.
defineStep('I set the policy {string} to {string}', (key, value) => {
  cy.get(`[data-test="policy-${key}"]`).clear().type(value)
})
