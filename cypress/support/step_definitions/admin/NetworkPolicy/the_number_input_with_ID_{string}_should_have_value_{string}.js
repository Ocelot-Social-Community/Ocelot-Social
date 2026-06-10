import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the number input with ID {string} should have value {string}', (id, value) => {
  // Constrain to the number input so the step fails loudly if the field ever
  // regresses to a different element type (e.g. a checkbox), matching its intent.
  cy.get(`input[type="number"]#${id}`).should('have.value', value)
})
