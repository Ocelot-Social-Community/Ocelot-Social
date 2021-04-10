import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the post shows up on the landing page at position {int}", index => {
  cy.task('getValue', 'lastPost').then(lastPost => {
    const selector = `.post-teaser:nth-child(${index}) > .base-card`;
    cy.get(selector).should("contain", lastPost.title);
    cy.get(selector).should("contain", lastPost.content);
  })
});