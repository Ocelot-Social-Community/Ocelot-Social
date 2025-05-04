
defineStep('I add all required fields', () => {
  cy.get('input[name="title"]')
    .type('new post')
    .get('.editor .ProseMirror')
    .type('new post content')
})
