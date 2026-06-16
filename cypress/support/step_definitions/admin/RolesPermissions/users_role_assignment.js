import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

// The admin users page renders a per-user role <select> (data-test="user-role-select-<id>"),
// whose options are the assignable role names; selecting one fires setUserRole.
defineStep('I assign the role {string} to the user with id {string}', (roleName, userId) => {
  cy.get(`[data-test="user-role-select-${userId}"]`).select(roleName)
})

defineStep('the user with id {string} has the role {string} selected', (userId, roleName) => {
  // The select is one-way bound to user.roleName; after the mutation + refetch it
  // reflects the assigned role (Cypress retries until the refetch lands).
  cy.get(`[data-test="user-role-select-${userId}"]`).should('have.value', roleName)
})
