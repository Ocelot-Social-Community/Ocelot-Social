import { When } from "@badeball/cypress-cucumber-preprocessor";

When("I comment the following:", async text => {
  const comment = text.replace("\n", " ")
  cy.task('pushValue', { name: 'lastComment', value: comment })
  cy.get(".editor .ProseMirror").type(comment);
});
