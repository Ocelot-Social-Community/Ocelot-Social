import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the visibility', (visibility) => {
  cy.task('getValue', 'lastGroup').then((lastGroup) => {
    lastGroup.visibility = visibility.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    cy.get('select[name="visibility"]').select(lastGroup.visibility)
  })
})
