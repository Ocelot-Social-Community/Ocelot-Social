import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see no message input in the chat', () => {
  cy.get('vue-advanced-chat', { timeout: 15000 }).shadow().find('.vac-textarea').should('not.exist')
})
