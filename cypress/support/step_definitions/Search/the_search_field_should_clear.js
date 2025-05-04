
defineStep('the search field should clear', () => {
  cy.get('.searchable-input .ds-select input')
    .should('have.text', '')
})
