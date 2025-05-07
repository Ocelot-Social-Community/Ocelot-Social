import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I start editing a social media link', () => {
  cy.get('.ds-list-item-content > button.--icon-only')
    .first()
    .click()
})
