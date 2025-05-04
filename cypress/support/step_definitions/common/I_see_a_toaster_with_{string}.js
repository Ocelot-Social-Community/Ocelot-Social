import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see a toaster with {string}', (title) => {
  cy.get('.iziToast-message').should('contain', title)
})
