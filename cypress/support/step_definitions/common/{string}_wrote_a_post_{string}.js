import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import './../../factories'

defineStep('{string} wrote a post {string}', (author, title) => {
  cy.factory()
    .build('post', {
      title,
    }, {
      authorId: author,
    })
})
