import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see a link to page {string}', (path) => {
  cy.get(`a[href="${path}"]`).should('exist')
})
