import { Given } from "cypress-cucumber-preprocessor/steps";
import encode from '../../../backend/src/jwt/encode'

Given("I am logged in as {string}", slug => {
  cy.neode()
    .first("User", { slug })
    .then(user => {
      return new Cypress.Promise((resolve, reject) => {
        if(!user) {
          return reject(`User ${email} not found in database`)
        }
        return user.toJson().then((user) => resolve(user))
      })
    })
    .then(user => {
      cy.setCookie('ocelot-social-token', encode(user))
    })
});