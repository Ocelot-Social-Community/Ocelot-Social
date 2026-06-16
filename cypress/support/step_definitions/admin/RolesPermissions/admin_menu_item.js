import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The "Admin" entry in the avatar dropdown is shown only to roles holding an
// administration-group permission (auth/isAdmin). Mirrors the moderation-menu step.
defineStep('I see the admin menu item', () => {
  cy.get('.avatar-menu-popover').find('a[href="/admin"]').should('exist')
})

defineStep(`I can't see the admin menu item`, () => {
  // The dropdown is actually open (the Settings link proves it) — there is just no
  // admin entry for this role.
  cy.get('.avatar-menu-popover').find('a[href="/settings"]').should('exist')
  cy.get('.avatar-menu-popover').find('a[href="/admin"]').should('not.exist')
})
