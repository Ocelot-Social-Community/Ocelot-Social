import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose the following text as content:', text => {
  cy.task('getValue', 'lastPost').then(lastPost => {
    lastPost.content = text.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastPost', value: lastPost })
    cy.get('.editor .ProseMirror').type(lastPost.content)
  })
})
