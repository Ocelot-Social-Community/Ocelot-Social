import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I should see only {int} posts on the newsfeed", posts => {
  cy.get(".post-teaser")
    .should("have.length", posts);
});
  
