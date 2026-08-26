import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// mapbox-gl-js's GeolocateControl kicks off an async geolocation-support
// check in onAdd() (checkGeolocationSupport -> _setupUI). Switching away from
// "event" unmounts OsLocationMap (and its real mapbox-gl map) fast enough
// that this check can still resolve afterwards, once this._map is already
// gone — a known mapbox-gl-js race in third-party code, not this app's own,
// and harmless (the control it was about to label is already removed too).
Cypress.on('uncaught:exception', (err) => {
  // Message alone ("_getUIString") is a fairly unique token already, but
  // requiring the stack to point into mapbox-gl too keeps this from ever
  // accidentally swallowing an unrelated error in this app's own code that
  // happens to mention the same substring.
  if (err.message.includes('_getUIString') && /mapbox-gl/i.test(err.stack || '')) {
    return false
  }
})

// Clicks the article/event entry in the post-create sidebar menu.
// Matches by locale-independent URL target because the button label is i18n.
defineStep('I switch the post type to {string}', (type) => {
  cy.get(`.os-menu-item-link[href*="/post/create/${type}"]`, { timeout: 10000 }).click()
  cy.location('pathname').should('match', new RegExp(`/post/create/${type}`))
})
