import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the visibility', groupType => {
  cy.task('getValue', 'lastGroup').then(lastGroup => {
    lastGroup.groupType = groupType.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    // One card per type on the create form, not a select any more.
    cy.get(`[data-test="type-card-${lastGroup.groupType}"]`).click()
  })
})
