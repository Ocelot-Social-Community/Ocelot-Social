import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the first post on the newsfeed has the title:', title => {
  cy.get('.post-teaser:first')
    .should('contain', title)
})
