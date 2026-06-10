import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the number input with ID {string} should have value {string}', (id, value) => {
  cy.get(`#${id}`).should('have.value', value)
})
