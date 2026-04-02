import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I delete a social media link', () => {
  cy.get("button[title='Delete']")
    .click()
})
