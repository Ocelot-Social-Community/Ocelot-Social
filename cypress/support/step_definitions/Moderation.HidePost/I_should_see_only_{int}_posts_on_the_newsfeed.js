import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see only {int} posts on the newsfeed', posts => {
  cy.get('.post-teaser')
    .should('have.length', posts)
})
  
