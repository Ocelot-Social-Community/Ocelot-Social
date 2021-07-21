import { When } from "cypress-cucumber-preprocessor/steps";

When("I choose {string} as the title", async title => {
  const lastPost = {}
  lastPost.title = title.replace("\n", " ");
  cy.task('pushValue', { name: 'lastPost', value: lastPost })
  cy.get('input[name="title"]').type(lastPost.title);
});