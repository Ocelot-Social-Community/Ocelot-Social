import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Intercepts the browser→backend queryLocations GraphQL call (POST /api) and
// returns a single mocked result. The backend→MapBox call is never made, so
// the test does not depend on a real MapBox API key.
defineStep('location search returns {string} for {string}', (placeName, _searchTerm) => {
  cy.intercept('POST', '/api', (req) => {
    if (req.body && req.body.query && req.body.query.includes('queryLocations')) {
      req.reply({
        body: {
          data: {
            queryLocations: [{ id: 'place.mocked', place_name: placeName }],
          },
        },
      })
    }
  })
})
