import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the visibility', groupType => {
  cy.task('getValue', 'lastGroup').then(lastGroup => {
    lastGroup.groupType = groupType.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    cy.get('select[name="groupType"]').select(lastGroup.groupType)
  })
})
