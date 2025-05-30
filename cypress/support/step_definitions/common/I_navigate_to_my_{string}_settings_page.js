import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I navigate to my {string} settings page', settingsPage => {
  cy.get('.avatar-menu-trigger').click()
  cy.get('.avatar-menu-popover')
    .find('a[href]')
    .contains('Settings')
    .click()
  cy.contains('.ds-menu-item-link', settingsPage).click()
})
