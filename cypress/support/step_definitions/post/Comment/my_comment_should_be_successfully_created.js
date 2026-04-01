import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('my comment should be successfully created', () => {
  cy.get('.iziToast-message').contains('Comment submitted!')
})
