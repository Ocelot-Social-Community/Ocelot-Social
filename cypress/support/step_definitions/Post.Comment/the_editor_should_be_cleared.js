import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then("the editor should be cleared", () => {
  cy.get(".ProseMirror p").should("have.class", "is-empty");
});
