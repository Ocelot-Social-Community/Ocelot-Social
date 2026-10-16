import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

const graphqlBody = (req) => {
  if (typeof req.body !== 'string') return req.body
  try {
    return JSON.parse(req.body)
  } catch {
    return null
  }
}

// Typed and then picked from the suggestions, as a person does: the registration then sends the
// picked place by its Mapbox id (#10529), and the place on the profile is the one picked.
// Several suggestions may carry the name typed ("Paris", Île-de-France and Paris, Texas), so the
// first one is picked by its full name and its id remembered, for the registration to be checked
// against.
defineStep('I pick {string} as my location', (place) => {
  cy.intercept('POST', '/api', (req) => {
    const body = graphqlBody(req)
    const query = typeof body?.query === 'string' ? body.query : ''
    if (query.includes('queryLocations') && body.variables?.place === place) {
      req.alias = 'locationSuggestions'
    } else if (query.includes('SignupVerification')) {
      req.alias = 'signupVerification'
    }
  })

  cy.get('input#city', { timeout: 15000 }).type(place)
  cy.wait('@locationSuggestions').then(({ response }) => {
    const [picked] = response.body.data.queryLocations
    cy.wrap(picked.id).as('pickedLocationId')
    cy.get('.ds-select-option', { timeout: 15000 })
      .filter((_, option) => option.innerText.trim() === picked.place_name)
      .should('have.length', 1)
      .click()
  })
})

defineStep('my profile {string} shows {string} as my location', (slug, place) => {
  cy.get('@pickedLocationId').then((pickedLocationId) => {
    cy.wait('@signupVerification')
      .its('request.body.variables.locationId')
      .should('equal', pickedLocationId)
  })
  cy.visit(`/profile/${slug}`)
  cy.get('.location-info-button', { timeout: 15000 }).should('contain', place)
})
