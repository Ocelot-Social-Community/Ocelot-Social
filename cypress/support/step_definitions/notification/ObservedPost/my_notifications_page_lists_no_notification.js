import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The table shows its empty hint until the list has loaded as well, so the hint alone would also
// pass before the answer is in: wait for the query's answer first.
defineStep('my notifications page lists no notification', () => {
  cy.intercept('POST', '/api', (req) => {
    if (req.body && typeof req.body.query === 'string' && /\bnotifications\s*\(/.test(req.body.query)) {
      req.alias = 'notificationsList'
    }
  })
  cy.visit('/notifications')
  cy.wait('@notificationsList').its('response.body.data.notifications').should('have.length', 0)
  cy.get('.hc-empty-message').should('contain', "you don't have any notifications")
})
