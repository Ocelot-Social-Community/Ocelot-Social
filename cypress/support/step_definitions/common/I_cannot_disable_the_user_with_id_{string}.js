import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The user list offers the disable toggle only for users the viewer outranks
// (User.outrankedByCurrentUser, the same check the backend runs before disableUser).
// Anchored on the target's row being rendered, so the absence is not just a list that
// has not loaded yet.
defineStep('I cannot disable the user with id {string}', (userId) => {
  cy.get(`a[href^="/profile/${userId}/"]`).should('exist')
  cy.get(`[data-test="user-disable-${userId}"]`).should('not.exist')
})
