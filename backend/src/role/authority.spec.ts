import { describe, it, expect } from 'vitest'

import { allPermissionKeys } from '@src/permission'

import { PARTICIPATION_PERMISSIONS, dominatesInNetwork } from './authority'
import { DEFAULT_ROLES } from './defaults'
import { dominates } from './dominance'
import { ADMIN_ROLE, MODERATOR_ROLE, USER_ROLE } from './types'

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
