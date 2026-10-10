import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I am not offered the group chat', () => {
  // The join/leave button comes with the same query as the rights the chat button is decided by,
  // so once it shows the membership, the chat button's absence is an answer rather than a page
  // that has not rendered yet.
  cy.get('[data-test="join-leave-btn"]', { timeout: 15000 }).should('be.visible')
  cy.get('[data-test="chat-btn"]').should('not.exist')
})
