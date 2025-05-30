import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the search should contain the annoying user', () => {
  cy.get('.searchable-input .ds-select-dropdown')
    .should($li => {
      expect($li).to.have.length(1)
    })
  cy.get('.ds-select-dropdown .user-teaser .slug')
    .should('contain', '@annoying-user')
  cy.get('.searchable-input .ds-select input')
    .focus()
    .type('{esc}')
})
