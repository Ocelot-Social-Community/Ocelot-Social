import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the about', about => {
  cy.task('getValue', 'lastGroup').then(lastGroup => {
    lastGroup.about = about.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    cy.get('input[name="about"]').type(lastGroup.about)
  })
})
