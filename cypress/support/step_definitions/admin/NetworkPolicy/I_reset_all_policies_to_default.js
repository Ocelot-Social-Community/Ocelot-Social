import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// No network wait — same reasoning as "I save the policy form": cy.waitForNetworkIdle()
// watches GET only and never saw the resetPolicies POST, it just ate into the lifetime of
// the toast the next step asserts on.
defineStep('I reset all policies to default', () => {
  cy.get('[data-test="policy-reset"]').click()
})
