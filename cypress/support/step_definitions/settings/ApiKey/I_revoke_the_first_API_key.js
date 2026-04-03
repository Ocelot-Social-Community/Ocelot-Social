import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I revoke the first API key', () => {
  cy.get('[data-test="revoke-api-key"]')
    .first()
    .scrollIntoView()
    .should('be.visible')
    .click()
})
