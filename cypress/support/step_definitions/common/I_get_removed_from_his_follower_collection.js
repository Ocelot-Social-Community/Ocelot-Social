import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I get removed from his follower collection', () => {
  cy.get('.os-card')
    .not('.post-link')
  cy.get('.main-container')
    .contains('.os-card','is not followed by anyone')
  })
