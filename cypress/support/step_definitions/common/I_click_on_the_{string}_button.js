import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the {string} button', (label) => {
  cy.contains('.os-card .action-buttons button', label).click()
})
