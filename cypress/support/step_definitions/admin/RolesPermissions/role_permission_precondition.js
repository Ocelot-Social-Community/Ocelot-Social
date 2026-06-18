import { defineStep } from '@badeball/cypress-cucumber-preprocessor'

const ADMIN = { email: 'admin@example.org', password: '1234' }

// Set a role's permission deterministically via the REAL backend API (updateRole),
// not a direct DB write: the backend's RoleService keeps an in-memory cache that
// survives the per-scenario DB wipe, so only the mutation path actually updates what
// the server enforces. Read-modify-write the role's permission set so we add/remove
// exactly one key and leave the rest intact.
const setRolePermission = (roleName, permission, shouldHave) => {
  cy.authenticateAs(ADMIN).then((client) =>
    client
      .request(`query { roles { name permissions } }`)
      .then((data) => {
        const role = data.roles.find((r) => r.name === roleName)
        // Fail early with a clear cause (and the available roles) instead of an indirect
        // updateRole error / silent no-op when the fixture role is missing.
        expect(
          role,
          `role "${roleName}" not found among [${data.roles.map((r) => r.name).join(', ')}]`,
        ).to.exist
        const permissions = new Set(role.permissions)
        if (shouldHave) {
          permissions.add(permission)
        } else {
          permissions.delete(permission)
        }
        return client.request(
          `mutation ($name: String!, $permissions: [String!]!) {
            updateRole(name: $name, permissions: $permissions) {
              name
              permissions
            }
          }`,
          { name: roleName, permissions: [...permissions] },
        )
      })
      .then((data) => {
        expect(
          data.updateRole.permissions.includes(permission),
          `role "${roleName}" should ${shouldHave ? 'have' : 'not have'} "${permission}"`,
        ).to.equal(shouldHave)
      }),
  )
}

defineStep('the role {string} does not have the permission {string}', (roleName, permission) => {
  setRolePermission(roleName, permission, false)
})
