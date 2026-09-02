import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import CONFIG from '../../../../backend/build/src/config/index'

defineStep('I am logged in as {string}', slug => {
  cy.fixtures()
    .firstOf('User', { slug })
    // No missing-user branch: the fixture API throws with the slug it looked for when
    // nothing matches, which is the message this used to build by hand.
    .then(user => user.toJson())
    // Signed by the `signToken` task, i.e. in Node rather than in this browser bundle:
    // jsonwebtoken 9 needs `crypto.KeyObject`, which the browser polyfill does not provide.
    // The config still comes from here (Cypress.env()), so only the signing moved — see the
    // task in cypress/cypress.config.js. Spelled out field by field because a task argument
    // crosses a serialisation boundary, and these four are all `encode` reads.
    .then(user =>
      cy.task('signToken', {
        user,
        config: {
          JWT_SECRET: CONFIG.JWT_SECRET,
          JWT_EXPIRES: CONFIG.JWT_EXPIRES,
          GRAPHQL_URI: CONFIG.GRAPHQL_URI,
          CLIENT_URI: CONFIG.CLIENT_URI,
        },
      }),
    )
    .then(token => {
      cy.setCookie('ocelot-social-token', token)
    })
})
