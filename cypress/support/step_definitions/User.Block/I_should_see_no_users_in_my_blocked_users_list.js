import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see no users in my blocked users list', () => {
  cy.get('.ds-placeholder')
    .should('contain', 'So far, you have not blocked anybody.')
})
