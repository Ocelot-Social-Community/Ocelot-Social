import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

const badgeSelector =
  '.action-buttons button .os-counter-icon__count.os-counter-icon__count--danger'

defineStep('I see no unread chat messages on the profile', () => {
  cy.get('.action-buttons button', { timeout: 15000 }).should('exist')
  cy.get(badgeSelector).should('not.exist')
})

defineStep('I see {int} unread chat message on the profile', (count) => {
  cy.get(badgeSelector, { timeout: 15000 }).should('contain', count)
})
