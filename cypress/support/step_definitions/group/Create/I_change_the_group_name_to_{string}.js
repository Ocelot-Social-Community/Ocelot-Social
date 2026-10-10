import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I change the group name to {string}', (name) => {
  cy.get('input[name="name"]').clear().type(name)
})
