
defineStep('I can cancel editing', () => {
  cy.get('button#cancel')
    .click()
    .get('input#editSocialMedia')
    .should('have.length', 0)
})
