import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the {string} post was saved successfully without a teaser image', condition => {
  cy.get(".os-card > .title")
    .should("contain", condition === 'updated' ? 'to be updated' : 'new post')
    .get(".content")
    .should("contain", condition === 'updated' ? 'successfully updated' : 'new post content')
    .get('.post-page')
    .should('exist')
    .get('.os-card__hero-image > .image')
    .should('not.exist')
})
