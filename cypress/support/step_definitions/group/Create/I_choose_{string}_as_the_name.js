import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I choose {string} as the name', name => {
  const typed = name.replace('\n', ' ')
  // The backend stores a group name without its surrounding spaces, so that is what the saved
  // group shows.
  const lastGroup = { name: typed.trim() }
  cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
  cy.get('input[name="name"]').type(typed)
})
