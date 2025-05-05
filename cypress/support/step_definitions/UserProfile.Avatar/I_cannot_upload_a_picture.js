import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I cannot upload a picture', () => {
  cy.get('.base-card')
    .children()
    .should('not.have.id', 'customdropzone')
    .should('have.class', 'profile-avatar')
})
