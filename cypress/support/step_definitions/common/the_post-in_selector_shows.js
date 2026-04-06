import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the post-in selector shows {string}', (name) => {
  cy.get('[data-test="post-in-link"]', { timeout: 15000 }).should('have.text', name)
})
