import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I enter the date {string} in the event start date picker', (date) => {
  cy.get('.mx-datepicker').first().find('input').clear().type(date).type('{enter}')
})
