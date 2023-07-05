import { Given } from "@badeball/cypress-cucumber-preprocessor";

Given('{string} wrote a post {string}', (author, title) => {
  cy.factory()
    .build("post", {
      title,
    }, {
      authorId: author,
    });
});
