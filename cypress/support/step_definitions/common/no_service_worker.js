// EXPERIMENT (page-load hang): the webapp registers a workbox service worker (@nuxtjs/pwa) with
// skipWaiting + clientsClaim and scope `/`, which on localhost:3000 covers the Cypress runner
// (`/__/`) as well. Since the suite moved to Chrome (#10230), a `cy.visit` now and then never
// fires `load` — 36 times in a month, mostly early in Event.feature and the first Paris example
// of NameDescriptionLocation.feature — and the frame stays on the previous page although the
// document request was answered. The worker installing and claiming clients in that window is
// the best-fitting candidate, unproven. No spec exercises it, so the suite takes it away: the
// registration (workbox.js) then fails inside its own catch and the app runs without one.
//
// Keep it if the hang stops; otherwise the net log uploaded with a failed job (see
// `before:browser:launch` in cypress.config.js) shows which request stalls instead.
Cypress.on('window:before:load', (win) => {
  delete Object.getPrototypeOf(win.navigator).serviceWorker
})
