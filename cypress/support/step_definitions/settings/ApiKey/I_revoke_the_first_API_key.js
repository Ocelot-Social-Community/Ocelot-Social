import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I revoke the first API key', () => {
  cy.get('button[aria-label="settings.api-keys.list.revoke"]').first().click()
})
