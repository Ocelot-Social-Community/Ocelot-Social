import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// No network wait here on purpose. cy.waitForNetworkIdle() defaults to watching GET requests
// only, while every GraphQL call the webapp makes is a POST to /api — so it never observed
// this save at all (measured: zero matching requests, a flat ~2 s). All it did was push the
// following toast assertion that much further into the toast's lifetime, with a ceiling of
// responseTimeout (30 s) against a toast that lives 15 s.
//
// The toast assertion is the barrier instead: the toast is raised only after the setPolicy
// mutation resolves, and the assertion retries on its own.
defineStep('I save the policy form', () => {
  cy.get('[data-test="policy-save"]').click()
})
