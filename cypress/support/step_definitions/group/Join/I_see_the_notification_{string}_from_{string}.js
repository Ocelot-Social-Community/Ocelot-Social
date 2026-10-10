import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The notifications page lists one row per notification: who caused it, and why.
defineStep('I see the notification {string} from {string}', (reason, name) => {
  cy.get('.notification-grid-row', { timeout: 15000 })
    .filter(`:contains("${reason}")`)
    .should('contain', name)
})
