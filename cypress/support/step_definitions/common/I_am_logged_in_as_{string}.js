import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import CONFIG from '../../../../backend/build/src/config/index'
import { encode } from '../../../../backend/build/src/jwt/encode'

defineStep('I am logged in as {string}', slug => {
  cy.fixtures()
    .firstOf('User', { slug })
    // No missing-user branch: the fixture API throws with the slug it looked for when
    // nothing matches, which is the message this used to build by hand.
    .then(user => user.toJson())
    .then(user => {
      cy.setCookie('ocelot-social-token', encode({ config: CONFIG })(user))
    })
})
