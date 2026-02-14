import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the unread counter is removed', () => {
  cy.get('.notifications-menu .counter-icon .count')
    .should('not.exist')
})
