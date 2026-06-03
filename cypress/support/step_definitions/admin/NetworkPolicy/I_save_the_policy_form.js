import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

defineStep('I save the policy form', () => {
  cy.get('[data-test="policy-save"]').click()
  cy.waitForNetworkIdle(2000)
})
