import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I should see an abbreviated version of my comment", () => {
  cy.get("article.comment-card")
    .should("contain", "show more")
});