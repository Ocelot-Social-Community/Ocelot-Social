
defineStep('see {int} unread notifications in the top menu', count => {
  cy.get('.notifications-menu')
    .should('contain', count)
})
