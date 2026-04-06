import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the title input still contains {string}', (title) => {
  cy.get('input[name="title"]', { timeout: 5000 }).should('have.value', title)
})
