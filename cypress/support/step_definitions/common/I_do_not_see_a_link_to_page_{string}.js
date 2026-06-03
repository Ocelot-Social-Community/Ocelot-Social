import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I do not see a link to page {string}', (path) => {
  cy.get(`a[href="${path}"]`).should('not.exist')
})
