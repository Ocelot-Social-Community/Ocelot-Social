import { When } from "cypress-cucumber-preprocessor/steps";

When("mention {string} in the text", mention => {
  cy.get(".ProseMirror")
    .type(" @");
  cy.get(".suggestion-list__item")
    .contains(mention)
    .click();
});