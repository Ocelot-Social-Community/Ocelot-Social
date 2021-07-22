import { When } from "cypress-cucumber-preprocessor/steps";

When(/^I confirm the reporting dialog .*:$/, message => {
  cy.contains(message) // wait for element to become visible
  cy.get('.ds-modal')
    .within(() => {
      cy.get('.ds-radio-option-label')
        .first()
        .click({
          force: true
        })
      cy.get('button')
        .contains('Report')
        .click()
    })
})