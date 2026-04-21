import { defineStep } from '@badeball/cypress-cucumber-preprocessor'
import 'cypress-network-idle'

defineStep('I navigate directly to the remembered post URL', () => {
  cy.get('@rememberedPostUrl').then((pathname) => {
    cy.visit(pathname)
    cy.waitForNetworkIdle(2000)
  })
})
