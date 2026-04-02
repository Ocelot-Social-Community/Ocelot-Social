import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the {string} tab', (type) => {
  cy.get(`[data-test="${type}-tab"]`).should('not.have.class', '--disabled')
  cy.get(`[data-test="${type}-tab-click"]`).click()
})
