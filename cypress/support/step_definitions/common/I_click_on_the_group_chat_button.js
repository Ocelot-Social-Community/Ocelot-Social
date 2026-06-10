import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the group chat button', () => {
  cy.contains('button', /Gruppenchat|Group Chat/i, { timeout: 10000 }).click()
})
