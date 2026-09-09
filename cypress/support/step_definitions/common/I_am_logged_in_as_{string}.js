import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I am logged in as {string}', slug => {
  cy.fixtures()
    .firstOf('User', { slug })
    // No missing-user branch: the fixture API throws with the slug it looked for when
    // nothing matches, which is the message this used to build by hand.
    .then(user => user.toJson())
    // Signed by the `signToken` task, i.e. in Node rather than in this browser bundle:
    // jsonwebtoken 9 needs `crypto.KeyObject`, which the browser polyfill does not provide.
    // The task reads the signing config itself — deliberately NOT passed from here, so that
    // JWT_SECRET never has to be among the values exposed to the browser. See cypress.config.js.
    .then(user => cy.task('signToken', { user }))
    .then(token => {
      cy.setCookie('ocelot-social-token', token)
    })
})
