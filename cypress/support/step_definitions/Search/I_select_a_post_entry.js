
defineStep('I select a post entry', () => {
  cy.get('.searchable-input .search-post')
    .first()
    .trigger('click')
})
