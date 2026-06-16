import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

// Step definitions are scoped per feature ([filepath]/**) + common/**, so the copy
// living under moderation/ is not loaded for this feature — define it here too.
defineStep('I click on the avatar menu in the top right corner', () => {
  cy.get('.avatar-menu').click()
  cy.waitForNetworkIdle(2000)
})
