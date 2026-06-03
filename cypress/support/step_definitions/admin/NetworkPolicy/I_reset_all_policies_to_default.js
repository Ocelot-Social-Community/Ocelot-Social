import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

defineStep('I reset all policies to default', () => {
  cy.get('[data-test="policy-reset"]').click()
  cy.waitForNetworkIdle(2000)
})
