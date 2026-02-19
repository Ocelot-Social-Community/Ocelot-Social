import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the first image should not be displayed anymore', () => {
  cy.get('.os-card__hero-image > .image')
    .should('have.length', 1)
    .and('have.attr', 'src')
})
