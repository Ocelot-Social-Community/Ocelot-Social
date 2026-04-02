import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I select a user entry', () => {
  cy.get('.searchable-input .user-teaser')
    .first()
    .trigger('click')
})
