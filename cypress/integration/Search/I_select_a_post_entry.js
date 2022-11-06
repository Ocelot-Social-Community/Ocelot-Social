import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I select a post entry", () => {
  cy.get(".searchable-input .search-post")
    .first()
    .trigger("click");
});
