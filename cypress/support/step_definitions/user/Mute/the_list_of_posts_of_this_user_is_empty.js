import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('the list of posts of this user is empty', () => {
  cy.get('.profile-layout__main .hc-empty').should('be.visible')
  cy.get('.profile-layout__main .post-teaser').should('not.exist')
})
