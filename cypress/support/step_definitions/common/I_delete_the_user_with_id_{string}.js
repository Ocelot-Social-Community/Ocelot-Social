import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// Clicks the per-row delete button on the user list (shown to user.delete.any holders);
// opens the confirmation modal — confirm it with "I confirm the action in the modal".
defineStep('I delete the user with id {string}', (userId) => {
  cy.get(`[data-test="user-delete-${userId}"]`).click()
})
