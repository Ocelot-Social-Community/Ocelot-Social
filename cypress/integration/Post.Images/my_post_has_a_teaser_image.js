import { When } from "@badeball/cypress-cucumber-preprocessor";

When('my post has a teaser image', () => {
  cy.get('.contribution-form .image')
    .should('exist')
    .and('have.attr', 'src')
})
