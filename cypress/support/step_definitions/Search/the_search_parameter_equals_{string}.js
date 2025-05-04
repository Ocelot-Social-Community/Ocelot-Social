
defineStep('the search parameter equals {string}', search => {
  cy.location('search')
    .should('eq', search)
})
