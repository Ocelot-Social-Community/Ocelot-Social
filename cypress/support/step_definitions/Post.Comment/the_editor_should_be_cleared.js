import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the editor should be cleared', () => {
  cy.get('.ProseMirror p').should('have.class', 'is-empty')
})
