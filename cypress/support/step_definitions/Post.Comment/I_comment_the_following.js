import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I comment the following:', text => {
  const comment = text.replace('\n', ' ')
  cy.task('pushValue', { name: 'lastComment', value: comment })
  cy.get('.editor .ProseMirror').type(comment)
})
