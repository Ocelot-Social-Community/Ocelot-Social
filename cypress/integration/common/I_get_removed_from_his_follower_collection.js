import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I get removed from his follower collection", () => {
  cy.get(".base-card")
    .not(".post-link");
  cy.get(".main-container")
    .contains(".base-card","is not followed by anyone");
  });
