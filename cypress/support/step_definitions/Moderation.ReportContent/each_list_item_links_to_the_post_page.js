import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('each list item links to the post page', () => {
  cy.contains('The Truth about the Holocaust').click()
  cy.location('pathname').should('contain', '/post')
})
