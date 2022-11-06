import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('I see all the reported posts including the one from above', () => {
  cy.get('table tbody').within(() => {
    cy.contains('tr', 'The Truth about the Holocaust')
  })
})
