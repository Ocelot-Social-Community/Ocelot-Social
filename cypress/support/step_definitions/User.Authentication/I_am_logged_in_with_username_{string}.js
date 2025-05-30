import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I am logged in with username {string}', name => {
  cy.get('.avatar-menu').click()
  cy.get('.avatar-menu-popover').contains(name)
  cy.get('.avatar-menu').click() // Close menu again
})
