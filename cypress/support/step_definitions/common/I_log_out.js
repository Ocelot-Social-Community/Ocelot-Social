import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

defineStep('I log out', () => {
  cy.get('.avatar-menu').then(($menu) => {
    if (!$menu.is(':visible')){
      cy.scrollTo('top')
      cy.wait(500)
    }
  })
  cy.get('.avatar-menu')
    .click()
  cy.get('.avatar-menu-popover')
    .find('a[href="/logout"]')
    .click()
  cy.reload(true)
  cy.waitForNetworkIdle(2000)
})
