import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the list of posts of this user is empty", () => {
  cy.get(".base-card").not(".post-link");
  cy.get(".main-container").find(".ds-space.hc-empty");
});