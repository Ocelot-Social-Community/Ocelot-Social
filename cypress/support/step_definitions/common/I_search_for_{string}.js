import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I search for {string}', value => {
  cy.intercept({
    method: 'POST',
    url: 'http://localhost:3000/api',
  }).as('graphqlRequest')
  cy.get('.searchable-input .ds-select input')
    .focus()
    .type(value)
  cy.wait('@graphqlRequest')
})
