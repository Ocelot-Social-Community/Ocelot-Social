import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I type {string} and press escape', value => {
  cy.get('.searchable-input .ds-select input')
    .focus()
    .type(value)
    .type('{esc}')
})
