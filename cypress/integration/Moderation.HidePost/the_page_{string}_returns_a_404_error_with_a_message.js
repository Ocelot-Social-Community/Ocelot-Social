import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the page {string} returns a 404 error with a message:", (route, message) => {
  cy.request({
    url: route,
    failOnStatusCode: false
    })
    .its("status")
    .should("eq", 404);
  cy.visit(route, {
    failOnStatusCode: false
    });
  cy.get(".error-message").should("contain", message);
});