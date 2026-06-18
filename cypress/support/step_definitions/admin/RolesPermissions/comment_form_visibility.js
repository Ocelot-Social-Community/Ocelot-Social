import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

defineStep('I see the comment form', () => {
  cy.get('.comment-form').should('exist')
})

defineStep('I do not see the comment form', () => {
  cy.get('.comment-form').should('not.exist')
})

// The post page shows a dedicated placeholder when commenting is disabled for the
// viewer's role (post.comment.noPermission). Substring match keeps it robust to
// punctuation tweaks while still asserting the permission-specific reason.
defineStep('I see the commenting-disabled notice', () => {
  cy.contains('Commenting is not enabled').should('be.visible')
})
