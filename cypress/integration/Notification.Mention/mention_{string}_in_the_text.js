import { When } from "@badeball/cypress-cucumber-preprocessor";

When("mention {string} in the text", mention => {
  cy.get(".ProseMirror")
    .type(" @");
  cy.get(".suggestion-list__item")
    .contains(mention)
    .click();
});
