import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Clicks the per-row disable/enable toggle on the user list (shown to user.disable
// holders). Unlike delete it is reversible and fires immediately — no confirm modal.
// Only offered for users the viewer outranks (User.outrankedByCurrentUser); the backend
// enforces the same act-on hierarchy on the mutation.
defineStep('I disable the user with id {string}', (userId) => {
  cy.get(`[data-test="user-disable-${userId}"]`).click()
})
