import { When } from "cypress-cucumber-preprocessor/steps";

When("I choose the following text as content:", async text => {
  cy.task('getValue', 'lastPost').then(lastPost => {
    lastPost.content = text.replace("\n", " ");
    cy.task('pushValue', { name: 'lastPost', value: lastPost })
    cy.get(".editor .ProseMirror").type(lastPost.content);
  })
});