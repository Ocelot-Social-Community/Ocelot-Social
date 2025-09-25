import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

defineStep('I send a chat message to {string}', (recipientName) => {
  cy.visit('/chat')
  cy.waitForNetworkIdle(2000)
  cy.get('vue-advanced-chat')
    .should('be.visible')
  cy.get('.vac-add-icon')
    .click()
  cy.wait(500)
  cy.get('#search-user-to-add-to-group')
    // .clear()
    .type(recipientName)
   cy.get('.ds-select-option')
    .contains(recipientName)
    .click()
  cy.get('#roomTextarea')
    .type('Hey there!')
  cy.get('#vac-icon-send')
    .click()
})