import { Then } from "cypress-cucumber-preprocessor/steps";

Then('each list item links to the post page', () => {
  cy.contains('The Truth about the Holocaust').click();
  cy.location('pathname').should('contain', '/post')
})