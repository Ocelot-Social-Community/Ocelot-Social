import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see the comment form', () => {
  cy.get('.comment-form').should('be.visible')
})
