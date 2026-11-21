import { describe, it, expect } from 'vitest'

import { createInMemoryRoleService } from '@src/role'

import { viewerOutranksRole } from './actOnHierarchy'

import type { Context } from '@src/context'

// The request-level glue of the act-on rule; the rule itself is role/authority.spec.ts's.

const contextFor = (user: Context['user']): Context => {
  const role = createInMemoryRoleService()
  return {
    user,
    role,
    effectivePermissions: role.permissionsForRole(user?.roleName ?? 'user'),
  } as unknown as Context
}

describe(viewerOutranksRole, () => {
  it('places the owner above an admin by name', () => {
    const owner = { id: 'o', roleName: 'owner' } as unknown as Context['user']

    expect(viewerOutranksRole(contextFor(owner), 'admin')).toBe(true)
  })

  // A request without a user resolves to the baseline role, which outranks nobody.
  it('lets a request without a user outrank nobody', () => {
    expect(viewerOutranksRole(contextFor(null), 'user')).toBe(false)
    expect(viewerOutranksRole(contextFor(null), 'moderator')).toBe(false)
  })
})
