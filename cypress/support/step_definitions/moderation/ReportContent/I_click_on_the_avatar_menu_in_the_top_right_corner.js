import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the avatar menu in the top right corner', () => {
  cy.get('.avatar-menu').click()
  // Opening the dropdown is a client-side action (no network request), so sync on the
  // popover becoming visible rather than on network idle.
  cy.get('.avatar-menu-popover').should('be.visible')
})
