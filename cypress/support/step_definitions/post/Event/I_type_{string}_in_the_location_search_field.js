import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Types into the LocationSelect search input (#city).
// The LocationSelect debounces the input event by 500ms before firing the
// queryLocations GraphQL call, so the test should wait ~600ms afterwards.
defineStep('I type {string} in the location search field', (text) => {
  cy.get('#city').type(text)
})
