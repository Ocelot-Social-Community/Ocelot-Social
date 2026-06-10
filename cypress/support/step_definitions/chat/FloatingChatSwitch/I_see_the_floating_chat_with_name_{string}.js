import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the floating chat with name {string}', (name) => {
  cy.get('.chat-modul', { timeout: 15000 }).should('be.visible')
  cy.get('.chat-modul vue-advanced-chat .vac-room-name', { timeout: 60000 })
    .should('contain', name)
})
