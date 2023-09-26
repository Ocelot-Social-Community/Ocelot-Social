import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should see an abbreviated version of my comment", () => {
  cy.get("article.comment-card")
    .should("contain", "show more")
});
