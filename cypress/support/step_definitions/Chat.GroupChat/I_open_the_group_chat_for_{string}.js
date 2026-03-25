import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I open the group chat for {string}', (groupId) => {
  // Click the add-room button to open the search panel
  cy.get('[id="add-room"]', { timeout: 10000 }).click({ force: true })
  // Wait for the group list to appear and click the group
  cy.get('.group-list-item', { timeout: 10000 }).first().click()
})
