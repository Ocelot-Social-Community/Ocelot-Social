import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see {int} user results', (count) => {
  cy.get('.user-avatar').should('have.length', count)
})
