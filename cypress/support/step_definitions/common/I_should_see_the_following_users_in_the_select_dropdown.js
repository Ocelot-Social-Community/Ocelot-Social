import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see the following users in the select dropdown:', (table) => {
  cy.get('.searchable-input .search-heading').should('contain', 'Users')
  table.hashes().forEach(({ name }) => {
    cy.get('.searchable-input .ds-select-dropdown .user-avatar').should('contain', name)
  })
})
