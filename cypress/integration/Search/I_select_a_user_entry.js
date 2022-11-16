import { Then } from "cypress-cucumber-preprocessor/steps";

Then("I select a user entry", () => {
  cy.get(".searchable-input .user-teaser")
    .first()
    .trigger("click");
})