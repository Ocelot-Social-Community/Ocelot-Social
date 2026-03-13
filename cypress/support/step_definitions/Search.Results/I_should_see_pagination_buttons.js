import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see pagination buttons', () => {
  cy.get('[data-test="next-button"]').should('exist')
})
