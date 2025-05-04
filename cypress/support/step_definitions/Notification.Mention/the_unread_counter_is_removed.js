
defineStep('the unread counter is removed', () => {
  cy.get('.notifications-menu .counter-icon')
    .should('not.exist')
})
