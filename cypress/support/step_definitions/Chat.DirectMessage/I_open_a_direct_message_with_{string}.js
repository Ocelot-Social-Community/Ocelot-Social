import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I open a direct message with {string}', (userSlug) => {
  cy.get('vue-advanced-chat', { timeout: 10000 })
    .shadow()
    .find('.vac-add-icon')
    .should('be.visible')
    .click()
  cy.get('input#chat-search-combined', { timeout: 10000 }).type(userSlug)
  cy.get('.chat-search-result-detail', { timeout: 10000 }).contains(`@${userSlug}`).click()
})
