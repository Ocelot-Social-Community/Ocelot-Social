import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see pagination buttons', () => {
  cy.get('[data-test="previous-button"]').should('exist')
  cy.get('[data-test="next-button"]').should('exist')
})
