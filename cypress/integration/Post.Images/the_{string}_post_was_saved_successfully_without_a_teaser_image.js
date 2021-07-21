import { Then } from "cypress-cucumber-preprocessor/steps";

Then('the {string} post was saved successfully without a teaser image', condition => {
  cy.get(".base-card > .title")
    .should("contain", condition === 'updated' ? 'to be updated' : 'new post')
    .get(".content")
    .should("contain", condition === 'updated' ? 'successfully updated' : 'new post content')
    .get('.post-page')
    .should('exist')
    .get('.hero-image > .image')
    .should('not.exist')
})