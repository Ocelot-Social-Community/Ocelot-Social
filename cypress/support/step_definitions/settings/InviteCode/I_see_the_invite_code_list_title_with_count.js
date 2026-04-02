import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the invite code list title with count', () => {
  cy.get('.invite-code-list__title').should('be.visible')
  cy.get('.invite-code-list__count').should('be.visible').and('contain', '/')
})
