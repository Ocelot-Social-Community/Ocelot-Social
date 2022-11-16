import { Then } from "cypress-cucumber-preprocessor/steps";

Then('I see all the reported posts including the one from above', () => {
  cy.get('table tbody').within(() => {
    cy.contains('tr', 'The Truth about the Holocaust')
  })
})