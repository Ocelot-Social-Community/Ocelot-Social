import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I cannot login anymore', password => {
  cy.get('.iziToast-wrapper')
    .should('contain', 'Incorrect email address or password.')
})
