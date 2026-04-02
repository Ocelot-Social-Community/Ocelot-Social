import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the group was saved successfully', () => {
  cy.task('getValue', 'lastGroup').then(lastGroup => {
    cy.get('h3.ds-heading').should('contain', lastGroup.name)
  })
})
