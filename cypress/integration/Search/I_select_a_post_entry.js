import { When } from "cypress-cucumber-preprocessor/steps";

When("I select a post entry", () => {
  cy.get(".searchable-input .search-post")
    .first()
    .trigger("click");
});