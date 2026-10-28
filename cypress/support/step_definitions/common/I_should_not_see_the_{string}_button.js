import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should not see the {string} button', (label) => {
  cy.get('.os-card .action-buttons').should('exist')
  cy.get('.os-card .action-buttons button').each(($button) => {
    expect($button.text().trim()).not.to.contain(label)
  })
})
