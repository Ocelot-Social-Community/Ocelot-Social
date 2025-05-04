import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I search for {string}", value => {
  cy.intercept({
    method: "POST",
    url: "http://localhost:3000/api",
  }).as("graphqlRequest");
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get(".searchable-input .ds-select input")
    .focus()
    .type(value);
  cy.wait("@graphqlRequest");
});
