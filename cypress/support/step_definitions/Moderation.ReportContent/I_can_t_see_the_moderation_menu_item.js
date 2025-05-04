
defineStep(`I can't see the moderation menu item`, () => {
  cy.get('.avatar-menu-popover')
    .find('a[href="/settings"]', 'Settings')
    .should('exist') // OK, the dropdown is actually open
  
  cy.get('.avatar-menu-popover')
    .find('a[href="/moderation"]', 'Moderation')
    .should('not.exist')
})
