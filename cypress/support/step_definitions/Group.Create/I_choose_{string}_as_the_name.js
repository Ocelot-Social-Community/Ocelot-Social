import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the name', name => {
  const lastGroup = {}
  lastGroup.name = name.replace('\n', ' ')
  cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
  cy.get('input[name="name"]').type(lastGroup.name)
})
