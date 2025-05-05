import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see all the reported posts including from the user who muted me', () => {
  cy.get('table tbody').within(() => {
    cy.contains('tr', 'Fake news')
  })
})
