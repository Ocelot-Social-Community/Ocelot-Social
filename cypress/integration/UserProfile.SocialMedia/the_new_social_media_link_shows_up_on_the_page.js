import { Then } from "cypress-cucumber-preprocessor/steps";

Then('the new social media link shows up on the page', () => {
  cy.get('a[href="https://freeradical.zone/peter-pan"]')
    .should('have.length', 1)
})