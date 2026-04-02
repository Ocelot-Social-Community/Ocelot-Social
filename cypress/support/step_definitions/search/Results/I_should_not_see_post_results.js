import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should not see post results', () => {
  cy.get('.post-teaser').should('not.exist')
})
