import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('there is no button to pin a post', () => {
  cy.get('a.ds-menu-item-link')
    .should('contain', 'Report Post') // sanity check
    .should('not.contain', 'Pin post')
})
