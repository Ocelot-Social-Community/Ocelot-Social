import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I start to write a new post with the title {string} beginning with:', (title, intro) => {
  cy.get('input[name="title"]')
    .type(title)
  cy.get('.ProseMirror')
    .type(intro)
})
