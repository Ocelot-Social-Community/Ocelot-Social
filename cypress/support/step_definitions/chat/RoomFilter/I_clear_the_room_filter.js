import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I clear the room filter', () => {
  cy.get('vue-advanced-chat', { timeout: 15000 })
    .shadow()
    .find('input[type="search"]', { timeout: 10000 })
    .focus()
    .type('{selectall}{del}', { force: true })
})
