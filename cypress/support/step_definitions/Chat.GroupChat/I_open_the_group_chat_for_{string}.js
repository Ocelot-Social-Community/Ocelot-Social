import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I open the group chat for {string}', (groupSlug) => {
  cy.get('[id="add-room"]', { timeout: 10000 }).click({ force: true })
  cy.get('#chat-search-combined input', { timeout: 10000 }).type(groupSlug)
  cy.get('.chat-search-result-detail', { timeout: 10000 }).contains(`&${groupSlug}`).click()
})
