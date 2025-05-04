import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the author', () => {
  cy.get('[data-test="avatarUserLink"]')
    .click()
    .url().should('include', '/profile/')
})
