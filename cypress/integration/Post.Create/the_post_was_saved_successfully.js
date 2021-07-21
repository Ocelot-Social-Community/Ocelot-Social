import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the post was saved successfully", async () => {
  cy.task('getValue', 'lastPost').then(lastPost => {
    cy.get(".base-card > .title").should("contain", lastPost.title);
    cy.get(".content").should("contain", lastPost.content);
  })
});