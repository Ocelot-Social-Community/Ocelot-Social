import { When } from "cypress-cucumber-preprocessor/steps";

When('I click on the author', () => {
  cy.get('.user-teaser')
    .click()
    .url().should('include', '/profile/')
})