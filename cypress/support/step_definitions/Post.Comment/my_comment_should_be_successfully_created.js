
defineStep('my comment should be successfully created', () => {
  cy.get('.iziToast-message').contains('Comment submitted!')
})
