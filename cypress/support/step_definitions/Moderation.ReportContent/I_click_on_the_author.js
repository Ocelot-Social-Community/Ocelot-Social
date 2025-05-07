import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I click on the author', () => {
  cy.get('.user-teaser')
    .find('a[href*="/profile/"]')
    .first()
    .click()
    .url().should('include', '/profile/')
})
