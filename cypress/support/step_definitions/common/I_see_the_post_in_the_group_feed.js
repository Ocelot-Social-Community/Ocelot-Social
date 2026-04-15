import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the post {string} in the group feed', (title) => {
  cy.get('.post-teaser', { timeout: 15000 }).should('contain', title)
})
