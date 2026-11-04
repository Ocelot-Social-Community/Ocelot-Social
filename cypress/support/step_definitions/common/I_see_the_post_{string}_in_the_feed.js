import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the post {string} in the feed', (title) => {
  cy.get('.post-teaser').should('contain', title)
})
