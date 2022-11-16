import { When } from "cypress-cucumber-preprocessor/steps";

When('my post has a teaser image', () => {
  cy.get('.contribution-form .image')
    .should('exist')
    .and('have.attr', 'src')
})