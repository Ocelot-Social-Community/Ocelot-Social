import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the invite code count has increased', () => {
  cy.get('.invite-code-list__count').should('contain', '(1/')
})
