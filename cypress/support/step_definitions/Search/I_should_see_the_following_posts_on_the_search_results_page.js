import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see the following posts on the search results page:', table => {
  table.hashes().forEach(({ title }) => {  
    cy.get('.post-teaser')
      .should('contain',title)
  })
})
