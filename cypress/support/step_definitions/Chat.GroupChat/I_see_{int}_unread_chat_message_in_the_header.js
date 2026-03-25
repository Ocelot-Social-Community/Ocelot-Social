import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see no unread chat messages in the header', () => {
  cy.get('.chat-notification-menu:visible', { timeout: 15000 }).should('exist')
  cy.get('.chat-notification-menu:visible .count.--danger').should('not.exist')
})

defineStep('I see {int} unread chat message in the header', (count) => {
  cy.get('.chat-notification-menu:visible .count.--danger', { timeout: 15000 }).should(
    'contain',
    count,
  )
})
