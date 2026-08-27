import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('a user has blocked me', () => {
  cy.fixtures()
    .firstOf('User', {
      name: 'Peter Pan'
    })
    .then(blockedUser => {
      cy.fixtures()
        .firstOf('User', {
          name: 'Harassing User'
        })
        .relateTo(blockedUser, 'blocked')
    })
})
