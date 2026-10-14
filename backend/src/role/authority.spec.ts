import { describe, it, expect } from 'vitest'

import { allPermissionKeys } from '@src/permission'

import {
  PARTICIPATION_PERMISSIONS,
  coversInNetwork,
  dominatesInNetwork,
  mayAssignNetworkRole,
  mayChangeNetworkRole,
} from './authority'
import { DEFAULT_ROLES } from './defaults'
import { dominates } from './dominance'
import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

import type { PermissionKey } from '@src/permission'

const set = (...keys: PermissionKey[]): Set<PermissionKey> => new Set(keys)
const role = (name: string): Set<PermissionKey> =>
  new Set(DEFAULT_ROLES.find((definition) => definition.name === name)?.permissions)

// A role made for administration only, as networks build them: it may delete and disable
// accounts, but not post — the shape that could act on nobody under the full-set comparison.
const office = set('user.delete.any', 'user.disable')

describe('dominatesInNetwork (act-on hierarchy over authority)', () => {
  it('lets an administration-only role act on a plain user', () => {
    expect(dominatesInNetwork(office, role(USER_ROLE))).toBe(true)
  })

  it('differs from the full-set rule exactly there', () => {
    // The full sets are incomparable: the user holds post.create & co., the office role not.
    expect(dominates(office, role(USER_ROLE))).toBe(false)
  })

  it('still forbids peers', () => {
    expect(dominatesInNetwork(office, office)).toBe(false)
    expect(dominatesInNetwork(role(USER_ROLE), role(USER_ROLE))).toBe(false)
  })

  it('still forbids acting on a target holding authority the actor lacks', () => {
    // moderator holds content.moderate and badge.manage, office does not: incomparable.
    expect(dominatesInNetwork(office, role(MODERATOR_ROLE))).toBe(false)
    expect(dominatesInNetwork(office, role(ADMIN_ROLE))).toBe(false)
  })

  it('lets a role holding more authority act on the administration-only role', () => {
    expect(dominatesInNetwork(role(ADMIN_ROLE), office)).toBe(true)
  })

  it('does not rank by participation: more posting rights outrank nobody', () => {
    expect(dominatesInNetwork(set('post.create', 'comment.create'), set('post.create'))).toBe(false)
    expect(dominatesInNetwork(set(...PARTICIPATION_PERMISSIONS), set())).toBe(false)
  })

  it('does not let participation the target holds block the actor', () => {
    expect(dominatesInNetwork(set('user.disable'), set(...PARTICIPATION_PERMISSIONS))).toBe(true)
  })

  it('keeps the default chain owner ⊋ admin ⊋ moderator ⊋ user', () => {
    const owner = new Set(allPermissionKeys())

    expect(dominatesInNetwork(owner, role(ADMIN_ROLE))).toBe(true)
    expect(dominatesInNetwork(role(ADMIN_ROLE), role(MODERATOR_ROLE))).toBe(true)
    expect(dominatesInNetwork(role(MODERATOR_ROLE), role(USER_ROLE))).toBe(true)
    expect(dominatesInNetwork(owner, owner)).toBe(false)
  })

  it('lets the full catalog (owner) outrank a role holding every authority right', () => {
    const owner = new Set(allPermissionKeys())
    const allAuthority = new Set(
      allPermissionKeys().filter((key) => !PARTICIPATION_PERMISSIONS.includes(key)),
    )

    // Equal authority — without the owner rule these would be peers.
    expect(dominatesInNetwork(owner, allAuthority)).toBe(true)
    expect(dominatesInNetwork(allAuthority, owner)).toBe(false)
  })

  it('leaves the plain user role without any authority', () => {
    // Guards the premise of the whole rule: every right the baseline role holds is
    // participation. A new baseline right that is not listed would rank `user` above an
    // administration-only role again.
    for (const key of role(USER_ROLE)) {
      expect(PARTICIPATION_PERMISSIONS).toContain(key)
    }
  })
})

describe(coversInNetwork, () => {
  it('holds when the actor has every authority right handed out', () => {
    expect(coversInNetwork(role(ADMIN_ROLE), role(MODERATOR_ROLE))).toBe(true)
  })

  it('fails on a single authority right the actor lacks', () => {
    expect(coversInNetwork(role(MODERATOR_ROLE), ['policy.manage'])).toBe(false)
  })

  // An administrative role without `post.create` must still be able to hand out `user`.
  it('does not count participation', () => {
    expect(coversInNetwork(office, role(USER_ROLE))).toBe(true)
  })
})

describe('mayAssignNetworkRole (#10485)', () => {
  const moderator = { permissions: role(MODERATOR_ROLE), roleName: MODERATOR_ROLE }
  const assign = (
    actor: { permissions: Set<PermissionKey>; roleName: string },
    target: string,
    assigned: string,
    self = false,
  ) =>
    mayAssignNetworkRole({
      actor,
      self,
      targetRoleName: target,
      targetPermissions: target === OWNER_ROLE ? set(...allPermissionKeys()) : role(target),
      assignedRoleName: assigned,
      assignedPermissions: assigned === OWNER_ROLE ? set(...allPermissionKeys()) : role(assigned),
    })

  it('refuses re-roling somebody the actor does not outrank', () => {
    expect(assign(moderator, ADMIN_ROLE, USER_ROLE)).toBe('notOutranked')
  })

  it('refuses handing out a role the actor does not cover', () => {
    expect(assign(moderator, USER_ROLE, ADMIN_ROLE)).toBe('notCovered')
  })

  it('asks only for coverage on oneself: stepping down, not up', () => {
    expect(assign(moderator, MODERATOR_ROLE, USER_ROLE, true)).toBeNull()
    expect(assign(moderator, MODERATOR_ROLE, ADMIN_ROLE, true)).toBe('notCovered')
  })

  it('gives and takes the owner role by owners only', () => {
    const admin = { permissions: role(ADMIN_ROLE), roleName: ADMIN_ROLE }

    expect(assign(admin, USER_ROLE, OWNER_ROLE)).toBe('ownerOnly')
    expect(assign(admin, OWNER_ROLE, USER_ROLE)).toBe('ownerOnly')
  })

  // A request without a user resolves to the baseline, never to an owner.
  it('refuses the owner role to an actor without a role of their own', () => {
    expect(assign({ permissions: set(), roleName: USER_ROLE }, USER_ROLE, OWNER_ROLE)).toBe(
      'ownerOnly',
    )
  })

  it('lets an owner re-role another owner', () => {
    const owner = { permissions: set(...allPermissionKeys()), roleName: OWNER_ROLE }

    expect(assign(owner, OWNER_ROLE, USER_ROLE)).toBeNull()
  })
})

describe('mayChangeNetworkRole (#10485)', () => {
  const others = [ADMIN_ROLE, MODERATOR_ROLE, USER_ROLE].map((name) => ({
    name,
    permissions: role(name),
  }))
  const change = (
    actorRole: string,
    roleName: string,
    newPermissions?: PermissionKey[],
    actorPermissions = role(actorRole),
  ) =>
    mayChangeNetworkRole({
      actor: { permissions: actorPermissions, roleName: actorRole },
      roleName,
      rolePermissions: role(roleName),
      newPermissions,
      otherRoles: others,
    })

  it('refuses a role the actor neither holds nor outranks', () => {
    expect(change(MODERATOR_ROLE, ADMIN_ROLE)).toBe('notOutranked')
  })

  it('lets the actor shape their own role, giving it a right they lacked', () => {
    expect(change(ADMIN_ROLE, ADMIN_ROLE, [...role(ADMIN_ROLE)])).toBeNull()
    expect(change(MODERATOR_ROLE, MODERATOR_ROLE, [...role(MODERATOR_ROLE), 'post.pin'])).toBeNull()
  })

  it('renames or deletes their own role without a rights check', () => {
    expect(change(MODERATOR_ROLE, MODERATOR_ROLE)).toBeNull()
  })

  it('refuses raising their own role above a role it does not outrank today', () => {
    // An admin role short of one right is outranked by every admin right plus that one.
    const shortAdmin = new Set([...role(ADMIN_ROLE)].filter((key) => key !== 'branding.manage'))
    const result = mayChangeNetworkRole({
      actor: { permissions: role(MODERATOR_ROLE), roleName: MODERATOR_ROLE },
      roleName: MODERATOR_ROLE,
      rolePermissions: role(MODERATOR_ROLE),
      newPermissions: [...shortAdmin, 'branding.manage'],
      otherRoles: [{ name: ADMIN_ROLE, permissions: shortAdmin }],
    })

    expect(result).toBe('wouldOutrank')
  })

  it('ignores roles it outranks already when raising their own', () => {
    expect(change(ADMIN_ROLE, ADMIN_ROLE, [...role(ADMIN_ROLE)])).toBeNull()
  })

  it('fills a role the actor outranks only with rights they hold', () => {
    expect(change(MODERATOR_ROLE, USER_ROLE, [...role(USER_ROLE), 'badge.manage'])).toBeNull()
    expect(change(MODERATOR_ROLE, USER_ROLE, ['policy.manage'])).toBe('notCovered')
  })
})
