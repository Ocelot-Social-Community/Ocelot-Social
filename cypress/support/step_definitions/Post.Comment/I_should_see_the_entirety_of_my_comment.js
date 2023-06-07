import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should see the entirety of my comment", () => {
  cy.get("article.comment-card")
    .should("not.contain", "show more")
});
