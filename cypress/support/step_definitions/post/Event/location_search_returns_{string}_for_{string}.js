import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Intercepts the browser→backend queryLocations GraphQL call (POST /api) and
// returns a single mocked result. The backend→MapBox call is never made, so
// the test does not depend on a real MapBox API key.
//
// Stringify req.body before searching so the check works whether Cypress
// auto-parsed the JSON body into an object or left it as a raw string.
// __typename is required so Apollo's InMemoryCache can normalise the result.
defineStep('location search returns {string} for {string}', (placeName, _searchTerm) => {
  cy.intercept('POST', '/api', (req) => {
    const bodyStr =
      typeof req.body === 'string' ? req.body : req.body ? JSON.stringify(req.body) : ''
    if (bodyStr.includes('queryLocations')) {
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        // Body as a JSON string avoids any potential double-serialisation by Cypress.
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
