import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Set (or reset) the per-slot branding composition through the admin API, the way an admin's
// switch reaches every open client: as a policyChanged broadcast.
const setComposition = (composition) =>
  cy.authenticateAs({ email: 'admin@example.org', password: '1234' }).then((client) =>
    client
      .request(
        `mutation ($composition: String!) {
          setBrandingComposition(composition: $composition)
        }`,
        { composition },
      )
      .then((data) => {
        expect(data.setBrandingComposition, 'setBrandingComposition').to.equal(composition)
      }),
  )

defineStep('the branding composition is {string}', setComposition)
defineStep('an admin sets the branding composition to {string}', setComposition)

// The call's phase is what utils/reloadWhenIdle.js asks. A marker on the window tells whether the
// page was reloaded since: a reload replaces the window object and the marker with it.
defineStep('I am in a video call', () => {
  cy.window().should('have.property', '$nuxt')
  cy.window().then((win) => {
    win.__inTheCallSince = Date.now()
    win.$nuxt.$store.commit('videoCall/SET_PHASE', 'in-call')
  })
})

defineStep('the page has not been reloaded', () => {
  cy.window().its('__inTheCallSince').should('be.a', 'number')
  cy.window().its('$nuxt.$store.getters').its('videoCall/reloadPending').should('equal', true)
})

defineStep('I leave the video call', () => {
  cy.window().then((win) => win.$nuxt.$store.commit('videoCall/CLOSE'))
})

defineStep('the page is reloaded with the branding composition {string}', (composition) => {
  cy.window().should((win) => {
    expect(win.__inTheCallSince, 'marker of the page before the reload').to.equal(undefined)
    expect(win.__NUXT__.brandingComposition, 'composition the page was rendered with').to.equal(
      composition,
    )
  })
})
