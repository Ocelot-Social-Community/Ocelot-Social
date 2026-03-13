import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see {int} hashtag results', (count) => {
  cy.get('.hc-hashtag').should('have.length', count)
})
