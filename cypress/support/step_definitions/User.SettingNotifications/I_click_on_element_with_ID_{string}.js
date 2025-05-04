
defineStep('I click on element with ID {string}', (id) => {
  cy.get('#' + id).click()
})
