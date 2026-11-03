import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('they should not see the comment form', () => {
  cy.get('.comment-form').should('not.exist')
})
