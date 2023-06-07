import { Then } from "@badeball/cypress-cucumber-preprocessor";

Then('the new social media link shows up on the page', () => {
  cy.get('a[href="https://freeradical.zone/peter-pan"]')
    .should('have.length', 1)
})
