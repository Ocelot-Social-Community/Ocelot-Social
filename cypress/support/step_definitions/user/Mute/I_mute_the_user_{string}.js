import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I mute the user {string}', name => {
  cy.neode()
    .firstOf('User', { name })
    .then(mutedUser => {
      cy.neode()
        .firstOf('User', {
          name: 'Peter Pan'
        })
        .relateTo(mutedUser, 'muted')
    })
})
