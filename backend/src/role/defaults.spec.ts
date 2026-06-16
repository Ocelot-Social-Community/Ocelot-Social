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

  const BASELINE = [
    'post.create',
    'comment.create',
    'socialMedia.create',
    'group.create_public',
    'group.create_closed',
    'group.create_hidden',
    'user.invite',
    'videoCall.create_public',
    'apiKey.create',
  ]

  // The audited extras the admin role grants ON TOP of the baseline. Keep this in
  // sync with defaults.ts consciously — these tests assert the EXACT permission set
  // (not a subset), so any added/removed privilege turns red and must be reviewed.
  const ADMIN_EXTRAS = [
    'content.moderate',
    'badge.manage',
    'network.statistics.read',
    'role.manage',
    'policy.manage',
    'donation.manage',
    'apiKey.administer',
    'user.email.readAny',
    'user.delete.any',
    'post.pin',
    'post.push',
  ]

  // Order-independent exact-set comparison: catches both a missing capability AND
  // an unintended extra one (privilege escalation drift).
  const permsOf = (name: string) =>
    [...(DEFAULT_ROLES.find((role) => role.name === name)?.permissions ?? [])].sort()
  const exactly = (...perms: string[]) => [...perms].sort()

  it('gives the user role EXACTLY the baseline (no extra privileges)', () => {
    expect(permsOf(USER_ROLE)).toEqual(exactly(...BASELINE))
  })

  // Single-role model: each role's permission set is self-contained, so the
  // higher roles include the baseline rather than relying on a union.
  it('gives moderator EXACTLY baseline + content.moderate + badge.manage', () => {
    expect(permsOf(MODERATOR_ROLE)).toEqual(
      exactly(...BASELINE, 'content.moderate', 'badge.manage'),
    )
  })

  it('gives admin EXACTLY baseline + the audited admin extras (privilege-drift guard)', () => {
    expect(permsOf(ADMIN_ROLE)).toEqual(exactly(...BASELINE, ...ADMIN_EXTRAS))
  })
})
