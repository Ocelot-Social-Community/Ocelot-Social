import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Typed and then picked from the suggestions, as a person does: the registration then sends the
// picked place by its Mapbox id (#10529), and the place on the profile is the one picked.
defineStep('I pick {string} as my location', (place) => {
  cy.get('input#city', { timeout: 15000 }).type(place)
  cy.get('.ds-select-option', { timeout: 15000 }).contains(place).click()
})

defineStep('my profile {string} shows {string} as my location', (slug, place) => {
  cy.visit(`/profile/${slug}`)
  cy.get('.location-info-button', { timeout: 15000 }).should('contain', place)
})
