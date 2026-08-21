import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I mute the user {string}', name => {
  cy.fixtures()
    .firstOf('User', { name })
    .then(mutedUser => {
      cy.fixtures()
        .firstOf('User', {
          name: 'Peter Pan'
        })
        .relateTo(mutedUser, 'muted')
    })
})
