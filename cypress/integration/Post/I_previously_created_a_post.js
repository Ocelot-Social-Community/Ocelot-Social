import { Given } from "cypress-cucumber-preprocessor/steps";
import narrator from "../data/narrator"

Given("I previously created a post", () => {
    const lastPost = {
      title:  "previously created post",
      content: "with some content",
    };
    cy.factory()
      .build("post", lastPost, {
        authorId: narrator.id
      });
    cy.task('pushValue', { name: 'lastPost', value: lastPost })
  });