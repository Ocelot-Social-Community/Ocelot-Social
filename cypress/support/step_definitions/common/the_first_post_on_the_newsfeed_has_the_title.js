
defineStep('the first post on the newsfeed has the title:', title => {
  cy.get('.post-teaser:first')
    .should('contain', title)
})
