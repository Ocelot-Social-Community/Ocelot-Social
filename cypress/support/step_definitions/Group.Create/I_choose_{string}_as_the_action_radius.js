import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the action radius', actionRadius => {
  cy.task('getValue', 'lastGroup').then(lastGroup => {
    lastGroup.actionRadius = actionRadius.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    cy.get('select[name="actionRadius"]').select(lastGroup.actionRadius)
  })
})
