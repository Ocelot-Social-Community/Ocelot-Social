import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I create an API key with name {string}', (name) => {
  cy.get('#api-key-name').clear().type(name)
  cy.get('[data-test="create-api-key-submit"]').click()
})
