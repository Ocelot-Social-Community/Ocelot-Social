import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// mapbox-gl-js's GeolocateControl kicks off an async geolocation-support
// check in onAdd() (checkGeolocationSupport -> _setupUI). Switching away from
// "event" unmounts OsLocationMap (and its real mapbox-gl map) fast enough
// that this check can still resolve afterwards, once this._map is already
// gone — a known mapbox-gl-js race in third-party code, not this app's own,
// and harmless (the control it was about to label is already removed too).
Cypress.on('uncaught:exception', (err) => {
  // Deliberately message-only, not also checking err.stack for a
  // "mapbox-gl" source hint: CI builds the app in production mode, where
  // webpack bundles/chunks everything (including mapbox-gl-js) into hashed,
  // generic filenames like "1d3641f_3.18.4.js" — the literal string
  // "mapbox-gl" never appears in that stack, so a stricter check here always
  // misses in CI even though it passes locally against the (unminified,
  // real-path) dev server. "_getUIString" alone is already a distinctive
  // enough token — it's mapbox-gl-js's own internal method name, not
  // something this app's own code would ever throw.
  if (err.message.includes('_getUIString')) {
    return false
  }
})

// Clicks the article/event entry in the post-create sidebar menu.
// Matches by locale-independent URL target because the button label is i18n.
defineStep('I switch the post type to {string}', (type) => {
  cy.get(`.os-menu-item-link[href*="/post/create/${type}"]`, { timeout: 10000 }).click()
  cy.location('pathname').should('match', new RegExp(`/post/create/${type}`))
})
