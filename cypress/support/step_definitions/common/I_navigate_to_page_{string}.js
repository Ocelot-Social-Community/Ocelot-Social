import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

defineStep('I navigate to page {string}', page => {
  cy.visit(page)
  cy.waitForNetworkIdle(2000)
})
