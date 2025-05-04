import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('they can see the following text in the info box below my avatar:', text => {
  cy.contains(text)
})
