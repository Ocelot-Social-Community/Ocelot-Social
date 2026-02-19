import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the list of posts of this user is empty', () => {
  cy.get('.os-card').not('.post-link')
  cy.get('.main-container').find('.ds-space.hc-empty')
})
