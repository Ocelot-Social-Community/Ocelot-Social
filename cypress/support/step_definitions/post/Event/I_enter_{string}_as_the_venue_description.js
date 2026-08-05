import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I enter {string} as the venue description', (venue) => {
  cy.get('input[name="eventVenue"]').type(venue)
})
