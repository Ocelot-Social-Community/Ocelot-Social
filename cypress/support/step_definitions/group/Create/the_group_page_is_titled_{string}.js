import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the group page is titled {string}', (name) => {
  cy.get('h3.ds-heading', { timeout: 15000 }).should('contain', name)
})
