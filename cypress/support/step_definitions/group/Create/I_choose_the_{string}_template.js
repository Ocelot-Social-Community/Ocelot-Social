import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Creating a group names a TEMPLATE now, picked from a row of cards — not a visibility from a
// select. The template is remembered as the group's visibility for the later assertions, which
// holds for the three templates named after one; a `channel` would need the derived value.
defineStep('I choose the {string} template', (template) => {
  cy.task('getValue', 'lastGroup').then((lastGroup) => {
    lastGroup.visibility = template.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    cy.get(`[data-test="template-card-${lastGroup.visibility}"]`).click()
  })
})
