import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I type {string} in the room filter', (text) => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('input[type="search"]', { timeout: 10000 })
    .should('be.visible')
    .type(text)
})
