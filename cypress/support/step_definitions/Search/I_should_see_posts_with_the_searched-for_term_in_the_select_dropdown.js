import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I should see posts with the searched-for term in the select dropdown', () => {
  cy.get('.ds-select-dropdown')
    .should('contain','101 Essays that will change the way you think')
})
