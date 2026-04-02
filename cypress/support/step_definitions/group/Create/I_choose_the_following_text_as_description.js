import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose the following text as description:', text => {
  cy.task('getValue', 'lastGroup').then(lastGroup => {
    lastGroup.description = text.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    cy.get('.editor .ProseMirror').type(lastGroup.description)
  })
})
