import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('there is an annoying user who has muted me', () => {
  // The single-role model dropped the User.role property — the `role` build attr
  // is only a HAS_ROLE selector and is not persisted. Find the moderator by a
  // stable, persisted property (slug), matching how "I am logged in as" resolves it.
  cy.fixtures()
    .firstOf('User', {
      slug: 'moderator'
    })
    .then(mutedUser => {
      cy.fixtures()
        .firstOf('User', {
          id: 'user'
        })
      .relateTo(mutedUser, 'muted')
    })
})
