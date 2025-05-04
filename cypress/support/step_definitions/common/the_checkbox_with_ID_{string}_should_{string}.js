import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the checkbox with ID {string} should {string}', (id, value) => {
  cy.get('#' + id).should(value)
})
