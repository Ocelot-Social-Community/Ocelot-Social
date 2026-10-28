import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('they should see a text explaining why commenting is not possible', () => {
  cy.get('.ds-placeholder').should('contain', 'You cannot comment on this post at this time.')
})
