import { Given } from "cypress-cucumber-preprocessor/steps";
import narrator from "../data/narrator";

Given("I am logged in", () => {
  cy.neode()
    .first("User", { name: narrator.name })
    .then(user => {
      return new Cypress.Promise((resolve, reject) => {
        return user.toJson().then((user) => resolve(user))
      })
    })
    .then(user => cy.login(user))
});