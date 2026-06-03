import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the policy last-changed info naming {string}', (actor) => {
  cy.get('[data-test="policy-last-changed"]').should('be.visible').and('contain', actor)
})
