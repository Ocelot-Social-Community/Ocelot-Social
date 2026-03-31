import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click the add chat button', () => {
  cy.get('vue-advanced-chat', { timeout: 10000 })
    .shadow()
    .find('.vac-add-icon')
    .click({ force: true })
})
