import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the post shows up on the newsfeed at position {int}", index => {
  const selector = `.post-teaser:nth-child(${index}) > .base-card`;
  cy.get(selector).should("contain", 'previously created post');
  cy.get(selector).should("contain", 'with some content');
  
});