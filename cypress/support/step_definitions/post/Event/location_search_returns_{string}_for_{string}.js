import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Intercepts the browser→backend queryLocations GraphQL call (POST /api) and
// returns a single mocked result. The backend→MapBox call is never made, so
// the test does not depend on a real MapBox API key.
//
// Parse req.body and verify both the operation name and the search variable so
// this intercept only fires for the exact query triggered by the typed text.
// __typename is required so Apollo's InMemoryCache can normalise the result.
defineStep('location search returns {string} for {string}', (placeName, searchTerm) => {
  cy.intercept('POST', '/api', (req) => {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        body = null
      }
    }
    const queryStr = typeof body?.query === 'string' ? body.query : ''
    if (queryStr.includes('queryLocations') && body?.variables?.place === searchTerm) {
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          data: {
            queryLocations: [
              { __typename: 'LocationMapBox', id: 'place.mocked', place_name: placeName },
            ],
          },
        }),
      })
    }
  })
})
