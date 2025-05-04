
defineStep('I see a button with the label {string}', label => {
  cy.contains('button', label)
})
