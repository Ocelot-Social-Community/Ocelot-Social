import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Clicks the per-row disable/enable toggle on the user list (shown to user.disable
// holders). Unlike delete it is reversible and fires immediately — no confirm modal.
// The backend additionally enforces the act-on hierarchy (you can only disable a user
// whose permissions are a strict subset of yours), surfacing a denial as an error toast.
defineStep('I disable the user with id {string}', (userId) => {
  cy.get(`[data-test="user-disable-${userId}"]`).click()
})
