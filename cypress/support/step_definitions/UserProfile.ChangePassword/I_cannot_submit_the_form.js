
defineStep('I cannot submit the form', () => {
  cy.get('button[type=submit]')
    .should('be.disabled')
})
