import { When } from "@badeball/cypress-cucumber-preprocessor";

When("mention {string} in the text", mention => {
  cy.get(".ProseMirror")
    .type(" @");
  cy.contains(".suggestion-list__item", mention)
    .click();
});
