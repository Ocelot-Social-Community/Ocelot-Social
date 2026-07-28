import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Types into the LocationSelect search input (#city).
// The LocationSelect debounces the input event by 500ms before firing the
// queryLocations GraphQL call, so the test should wait ~600ms afterwards.
//
// Stub navigator.geolocation so requestGeoData's getProximityFromBrowser()
// fails immediately instead of waiting up to 3 seconds for a timeout. Without
// this the Apollo query fires after 500ms debounce + up to 3000ms geolocation
// timeout, which can exceed the 600ms wait in the feature file.
defineStep('I type {string} in the location search field', (text) => {
  cy.window().then((win) => {
    if (win.navigator.geolocation) {
      cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
        (_success, error) => {
          error({ code: 2, message: 'Position unavailable' })
        },
      )
    }
  })
  cy.get('#city').type(text)
})
