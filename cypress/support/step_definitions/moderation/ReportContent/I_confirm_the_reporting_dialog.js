import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep(/^I confirm the reporting dialog .*:$/, message => {
  cy.contains(message) // wait for element to become visible
  cy.get('.os-modal')
    .within(() => {
      cy.get('.report-radio-option')
        .first()
        .click({
          force: true
        })
      cy.get('button')
        .contains('Report')
        .click()
    })
})
