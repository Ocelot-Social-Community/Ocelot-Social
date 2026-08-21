import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I block the user {string}', name => {
  cy.fixtures()
    .firstOf('User', { name })
    .then(blockedUser => {
      cy.fixtures()
        .firstOf('User', {id: 'id-of-peter-pan'})
        .relateTo(blockedUser, 'blocked')
    })
})
