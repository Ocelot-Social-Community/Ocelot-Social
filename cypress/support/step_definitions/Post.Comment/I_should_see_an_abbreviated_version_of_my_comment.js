import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see an abbreviated version of my comment', () => {
  cy.get('article.comment-card')
    .should('contain', 'show more')
})
