import { Given } from "cypress-cucumber-preprocessor/steps";

Given('{string} wrote a post {string}', (_, title) => {
  cy.factory()
    .build("post", {
      title,
    }, {
      authorId: 'harassing-user',
    });
});