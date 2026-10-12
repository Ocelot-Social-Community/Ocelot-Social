import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The user list offers the delete button only for users the viewer outranks
// (User.outrankedByCurrentUser, the same check the backend runs before DeleteUser).
// Anchored on the target's row being rendered, so the absence is not just a list that
// has not loaded yet.
defineStep('I cannot delete the user with id {string}', (userId) => {
  cy.get(`a[href^="/profile/${userId}/"]`).should('exist')
  cy.get(`[data-test="user-delete-${userId}"]`).should('not.exist')
})
