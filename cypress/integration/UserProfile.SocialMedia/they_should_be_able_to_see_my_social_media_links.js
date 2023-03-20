import { Then } from "cypress-cucumber-preprocessor/steps";

Then('they should be able to see my social media links', () => {
  cy.get('[data-test="social-media-list-headline"]')
    .contains('Peter Pan')
    .get('a[href="https://freeradical.zone/peter-pan"]')
    .should('have.length', 1)
})