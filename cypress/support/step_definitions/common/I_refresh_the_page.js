import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I refresh the page', () => {
  cy.visit('/')
    .reload()
})
