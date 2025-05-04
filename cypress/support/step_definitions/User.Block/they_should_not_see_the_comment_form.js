import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('they should not see the comment form', () => {
  cy.get('.base-card').children().should('not.have.class', 'comment-form')
})
