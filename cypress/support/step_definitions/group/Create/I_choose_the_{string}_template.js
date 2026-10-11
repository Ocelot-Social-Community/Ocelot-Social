import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Creating a group names a TEMPLATE, picked from a row of cards — not a visibility from a
// select. Remembered under its own name: what the group ends up looking like is derived from
// the rights the template seeds, and two templates can derive to the same visibility.
defineStep('I choose the {string} template', (template) => {
  cy.task('getValue', 'lastGroup').then((lastGroup) => {
    lastGroup.template = template.replace('\n', ' ')
    cy.task('pushValue', { name: 'lastGroup', value: lastGroup })
    cy.get(`[data-test="template-card-${lastGroup.template}"]`).click()
  })
})
