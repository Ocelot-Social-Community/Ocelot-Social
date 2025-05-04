
defineStep('I refresh the page', () => {
  cy.visit('/')
    .reload()
})
