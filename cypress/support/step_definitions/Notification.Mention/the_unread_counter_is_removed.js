import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the unread counter is removed', () => {
  cy.get('.notifications-menu .os-counter-icon .os-counter-icon__count')
    .should('not.exist')
})
