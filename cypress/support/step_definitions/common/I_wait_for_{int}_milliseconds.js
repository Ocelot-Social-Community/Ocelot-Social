import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I wait for {int} milliseconds', time => {
  cy.wait(time)
})
