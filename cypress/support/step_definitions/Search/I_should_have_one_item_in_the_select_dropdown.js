import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should have one item in the select dropdown', () => {
  cy.get('.searchable-input .ds-select-dropdown').should($li => {
    expect($li).to.have.length(1)
  })
})
