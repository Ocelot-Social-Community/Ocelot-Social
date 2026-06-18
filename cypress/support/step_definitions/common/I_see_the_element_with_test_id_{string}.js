import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Generic existence check by data-test attribute (e.g. role tabs on /admin/roles,
// moderation area gates). Shared across features, hence in common/.
defineStep('I see the element with test id {string}', (testId) => {
  cy.get(`[data-test="${testId}"]`).should('exist')
})
