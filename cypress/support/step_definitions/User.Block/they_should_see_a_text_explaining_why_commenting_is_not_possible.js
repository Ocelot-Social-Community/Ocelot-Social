import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('they should see a text explaining why commenting is not possible', () => {
  cy.get('.ds-placeholder').should('contain', 'Commenting is not possible at this time on this post.')
})
