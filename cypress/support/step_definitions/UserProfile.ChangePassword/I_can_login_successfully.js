import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I can login successfully', () => {
  cy.get('.iziToast-wrapper')
     .should('contain', 'You are logged in!')
})
