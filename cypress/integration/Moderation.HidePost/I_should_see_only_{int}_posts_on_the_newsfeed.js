import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I should see only {int} posts on the newsfeed", posts => {
  cy.get(".post-teaser")
    .should("have.length", posts);
});
  