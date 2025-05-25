import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

defineStep('I click on the avatar menu in the top right corner', () => {
  cy.get('.avatar-menu').click()
  cy.waitForNetworkIdle(2000)
})
