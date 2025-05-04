import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I add all required fields", () => {
  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get('input[name="title"]')
    .type('new post')
    .get(".editor .ProseMirror")
    .type('new post content')
  })
