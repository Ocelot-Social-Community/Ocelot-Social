import { isKnownPermission } from '@src/permission'

import { DEFAULT_ROLES } from './defaults'
import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

describe('DEFAULT_ROLES', () => {
  it('seeds exactly the four built-in roles', () => {
    expect(DEFAULT_ROLES.map((role) => role.name)).toEqual([
      OWNER_ROLE,
      ADMIN_ROLE,
      MODERATOR_ROLE,
      USER_ROLE,
    ])
  })

  // Runtime drift guard (beyond the compile-time PermissionKey typing): every
  // permission a seeded role references must exist in the catalog.
  it('only references known permission keys', () => {
    for (const role of DEFAULT_ROLES) {
      for (const permission of role.permissions) {
        expect(isKnownPermission(permission)).toBe(true)
      }
    }
  })

  it('marks only owner as protected, with no stored permissions (expanded to all at runtime)', () => {
    const owner = DEFAULT_ROLES.find((role) => role.name === OWNER_ROLE)
    expect(owner?.protected).toBe(true)
    expect(owner?.permissions).toEqual([])
    for (const role of DEFAULT_ROLES.filter((r) => r.name !== OWNER_ROLE)) {
      expect(role.protected).toBe(false)
    }
  })

  const BASELINE = ['post.create', 'group.create', 'group.create_hidden', 'user.invite']

  it('gives the user baseline the everyday capabilities', () => {
    const user = DEFAULT_ROLES.find((role) => role.name === USER_ROLE)
    expect(user?.permissions).toEqual(expect.arrayContaining(BASELINE))
  })

  // Single-role model: each role's permission set is self-contained, so the
  // higher roles include the baseline rather than relying on a union.
  it('makes moderator self-contained (baseline + content.moderate)', () => {
    const moderator = DEFAULT_ROLES.find((role) => role.name === MODERATOR_ROLE)
    expect(moderator?.permissions).toEqual(
      expect.arrayContaining([...BASELINE, 'content.moderate']),
    )
  })

  it('makes admin self-contained (baseline + moderation + admin extras)', () => {
    const admin = DEFAULT_ROLES.find((role) => role.name === ADMIN_ROLE)
    expect(admin?.permissions).toEqual(
      expect.arrayContaining([...BASELINE, 'content.moderate', 'role.manage', 'policy.manage']),
    )
  })
})
