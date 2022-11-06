import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("I select a user entry", () => {
  cy.get(".searchable-input .user-teaser")
    .first()
    .trigger("click");
})
