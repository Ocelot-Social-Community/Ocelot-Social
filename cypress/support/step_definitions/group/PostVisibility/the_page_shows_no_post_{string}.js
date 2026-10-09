import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// A post opened by its link is rendered by the server; what comes back with the page is all there
// is, so neither the post nor any trace of its title may be in it.
defineStep('the page shows no post {string}', (title) => {
  cy.get('@rawPage').should('not.contain', title)
  cy.get('body', { timeout: 15000 }).should('be.visible')
  cy.get('.post-page').should('not.exist')
  cy.contains(title).should('not.exist')
})
