import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the group chat popup with name {string}', (groupName) => {
  cy.get('.chat-modul', { timeout: 15000 }).should('be.visible')
  // room-header-info slot is rendered in the light DOM of the web component
  cy.get('.chat-modul vue-advanced-chat .vac-room-name', { timeout: 60000 })
    .should('contain', groupName)
})
