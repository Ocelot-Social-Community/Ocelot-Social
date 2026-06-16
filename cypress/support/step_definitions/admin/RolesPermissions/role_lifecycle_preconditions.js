import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

const ADMIN = { email: 'admin@example.org', password: '1234' }

// Create a custom role granting exactly the given permission (or update it if it
// already exists) via the REAL backend API, so the RoleService in-memory cache — which
// survives the per-scenario DB wipe — reflects it, not just the DB.
defineStep('a role {string} granting {string} exists', (roleName, permission) => {
  cy.authenticateAs(ADMIN).then((client) =>
    client.request(`query { roles { name } }`).then((data) => {
      const exists = data.roles.some((role) => role.name === roleName)
      const mutation = exists
        ? `mutation ($name: String!, $permissions: [String!]!) {
            updateRole(name: $name, permissions: $permissions) { name }
          }`
        : `mutation ($name: String!, $permissions: [String!]!) {
            createRole(name: $name, permissions: $permissions) { name }
          }`
      return client.request(mutation, { name: roleName, permissions: [permission] })
    }),
  )
})

// Assign a user (by id) to a role via setUserRole — the real path that updates the
// HAS_ROLE edge and the role cache.
defineStep('the user with id {string} is assigned the role {string}', (userId, roleName) => {
  cy.authenticateAs(ADMIN).then((client) =>
    client.request(
      `mutation ($userId: ID!, $roleName: String!) {
        setUserRole(userId: $userId, roleName: $roleName) { id roleName }
      }`,
      { userId, roleName },
    ),
  )
})
