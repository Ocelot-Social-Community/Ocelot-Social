
defineStep('the old url is not displayed', () => {
  cy.get("a[href='https://freeradical.zone/peter-pan']")
    .should('have.length', 0)
})
  
