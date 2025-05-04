
defineStep('I see a {string} message:', (_type, message) => {
  cy.contains(message)
})
