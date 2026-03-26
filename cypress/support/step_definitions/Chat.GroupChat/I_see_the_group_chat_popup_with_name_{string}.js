import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the group chat popup with name {string}', (groupName) => {
  cy.get('.chat-modul', { timeout: 15000 }).should('be.visible').and('contain', groupName)
})
