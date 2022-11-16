import { Then } from "cypress-cucumber-preprocessor/steps";

Then("the editor should be cleared", () => {
  cy.get(".ProseMirror p").should("have.class", "is-empty");
});