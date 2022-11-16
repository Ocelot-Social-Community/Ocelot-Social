import { Given } from "cypress-cucumber-preprocessor/steps";

Given('{string} wrote a post {string}', (author, title) => {
  cy.factory()
    .build("post", {
      title,
    }, {
      authorId: author,
    });
});