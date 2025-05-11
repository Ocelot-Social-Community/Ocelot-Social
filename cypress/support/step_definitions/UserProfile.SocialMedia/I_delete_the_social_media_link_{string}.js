import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I delete the social media link {string}', (link) => {
  cy.get('.ds-list-item-content > button.--icon-only')
    .eq(1)
    .click()
  cy.get('.ds-modal')
    .should('be.visible')
    .get('button.confirm')
    .click()
  cy.get('.ds-list-item-content > a')
    .should('not.exist')
})
