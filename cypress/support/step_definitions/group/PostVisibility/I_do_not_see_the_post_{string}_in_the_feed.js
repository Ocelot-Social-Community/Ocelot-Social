import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Asked after a post that IS in the feed was seen, so the feed has loaded and an absence means
// something.
defineStep('I do not see the post {string} in the feed', (title) => {
  cy.get('.post-teaser').should('not.contain', title)
})
