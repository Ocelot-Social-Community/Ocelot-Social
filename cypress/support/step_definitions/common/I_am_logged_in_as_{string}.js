import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import CONFIG from '../../../../backend/build/src/config/index'
import { encode } from '../../../../backend/build/src/jwt/encode'

defineStep('I am logged in as {string}', slug => {
  cy.neode()
    .firstOf('User', { slug })
    .then(user => {
      return new Cypress.Promise((resolve, reject) => {
        if(!user) {
          return reject(`User ${email} not found in database`)
        }
        return user.toJson().then((user) => resolve(user))
      })
    })
    .then(user => {
      cy.setCookie('ocelot-social-token', encode({ config: CONFIG })(user))
    })
})
