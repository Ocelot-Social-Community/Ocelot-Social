import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('open the notification menu and click on the first item', () => {
  cy.get('.notifications-menu')
    .invoke('show')
    .click() // 'invoke('show')' because of the delay for show the menu
  cy.get('.notification-content a')
    .first()
    .click({force: true})
})
