import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Like "I see a link to page", but waits up to 15s — used to assert a live
// update arriving over the websocket (no page reload). Mirrors the timeout the
// chat-notification step uses for subscription delivery.
defineStep('I eventually see a link to page {string}', (path) => {
  cy.get(`a[href="${path}"]`, { timeout: 15000 }).should('exist')
})
