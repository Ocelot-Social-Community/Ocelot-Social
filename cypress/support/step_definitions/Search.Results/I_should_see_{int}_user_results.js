import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see {int} user results', (count) => {
  cy.get('.user-teaser').should('have.length', count)
})
