import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the post was saved successfully", async () => {
  cy.task('getValue', 'lastPost').then(lastPost => {
    cy.get(".base-card > .title").should("contain", lastPost.title);
    cy.get(".content").should("contain", lastPost.content);
  })
});
