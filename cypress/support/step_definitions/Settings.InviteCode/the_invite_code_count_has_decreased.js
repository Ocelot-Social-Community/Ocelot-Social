import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the invite code count has decreased', () => {
  cy.get('.invite-code-list__count').should('contain', '(0/')
})
