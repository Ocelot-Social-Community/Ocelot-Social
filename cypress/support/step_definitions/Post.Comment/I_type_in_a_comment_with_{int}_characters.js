import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I type in a comment with {int} characters', size => {
  var c = ''
  for (var i = 0; i < size; i++) {
    c += 'c'
  }
  cy.get('.editor .ProseMirror').type(c)
})
