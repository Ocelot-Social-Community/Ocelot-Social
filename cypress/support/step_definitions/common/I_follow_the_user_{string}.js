import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I follow the user {string}', name => {
  cy.fixtures()
    .firstOf('User', {name})
    .then(followed => {
      cy.fixtures()
        .firstOf('User', {
          name: 'Peter Pan'
        })
        .relateTo(followed, 'following')
    })
})
