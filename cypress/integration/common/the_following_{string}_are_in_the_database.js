import { Given } from "cypress-cucumber-preprocessor/steps";

Given("the following {string} are in the database:", (table,data) => {
  switch(table){
    case "posts":
      data.hashes().forEach((attributesOrOptions, i) => {
        cy.factory().build("post", {
          ...attributesOrOptions,
          deleted: Boolean(attributesOrOptions.deleted),
          disabled: Boolean(attributesOrOptions.disabled),
          pinned: Boolean(attributesOrOptions.pinned),
        }, {
          ...attributesOrOptions,
        });
      })
      break
    case "comments":
      data.hashes().forEach((attributesOrOptions, i) => {
        cy.factory().build("comment", {
          ...attributesOrOptions,
        }, {
          ...attributesOrOptions,
        });
      })
      break
  }
})