
defineStep('it should create a mention in the CommentForm', () => {
  cy.get('.ProseMirror a')
    .should('have.class', 'mention')
    .should('contain', '@peter-pan')
})
