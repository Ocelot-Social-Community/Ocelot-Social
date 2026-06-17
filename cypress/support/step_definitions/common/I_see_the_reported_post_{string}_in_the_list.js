import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Route-agnostic reports-list assertion: the reported post's row is visible in the
// table (works for both /moderation and /admin/reports, which render the same list).
defineStep('I see the reported post {string} in the list', (title) => {
  cy.get('table tbody', { timeout: 10000 }).within(() => {
    cy.contains('tr', title).should('be.visible')
  })
})
