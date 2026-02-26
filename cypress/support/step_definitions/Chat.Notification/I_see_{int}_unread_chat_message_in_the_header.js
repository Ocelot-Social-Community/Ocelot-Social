import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see {int} unread chat message in the header', (count) => {
  cy.get('.chat-notification-menu:visible .count.--danger', { timeout: 15000 }).should(
    'contain',
    count,
  )
})
