import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see {int} post results', (count) => {
  cy.get('.post-teaser').should('have.length', count)
})
