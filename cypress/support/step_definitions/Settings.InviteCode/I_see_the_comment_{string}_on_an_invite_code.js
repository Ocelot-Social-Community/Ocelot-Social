import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the comment {string} on an invite code', (comment) => {
  cy.get('.invitation .comment').should('contain', comment)
})
