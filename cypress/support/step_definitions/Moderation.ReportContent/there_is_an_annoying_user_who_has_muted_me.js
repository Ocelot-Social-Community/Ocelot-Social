import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('there is an annoying user who has muted me', () => {
  cy.neode()
    .firstOf('User', {
      role: 'moderator'
    })
    .then(mutedUser => {
      cy.neode()
        .firstOf('User', {
          id: 'user'
        })
      .relateTo(mutedUser, 'muted')
    })
})
