import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The "Moderation" entry in the avatar dropdown is shown to roles that may access the
// moderation area (auth/canAccessModeration). Mirrors the "can't see" step.
defineStep('I see the moderation menu item', () => {
  cy.get('.avatar-menu-popover').find('a[href="/moderation"]').should('exist')
})
