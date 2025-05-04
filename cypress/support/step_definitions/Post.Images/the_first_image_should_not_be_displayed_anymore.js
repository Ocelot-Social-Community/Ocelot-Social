
defineStep('the first image should not be displayed anymore', () => {
  cy.get('.hero-image')
    .children()
    .get('.hero-image > .image')
    .should('have.length', 1)
    .and('have.attr', 'src')
})
