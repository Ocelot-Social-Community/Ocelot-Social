
defineStep('I can visit the post page', () => {
  cy.contains('Fake news').click()
  cy.location('pathname').should('contain', '/post')
    .get('.base-card .title').should('contain', 'Fake news')
})
