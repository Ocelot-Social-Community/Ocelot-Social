import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see {int} group results', (count) => {
  cy.get('.group-avatar').should('have.length', count)
})
