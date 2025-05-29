import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('they can see {string} in the info box below my avatar', location => {
  cy.contains(location)
})
