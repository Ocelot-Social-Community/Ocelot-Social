import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the group {string} in the group list', (name) => {
  cy.get('.group-teaser', { timeout: 15000 }).should('contain', name)
})
