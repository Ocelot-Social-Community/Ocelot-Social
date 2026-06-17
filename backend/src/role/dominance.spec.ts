import { dominates } from './dominance'

import type { PermissionKey } from '@src/permission'

const set = (...keys: string[]): Set<PermissionKey> => new Set(keys as PermissionKey[])

describe('dominates (act-on hierarchy: actor ⊋ target)', () => {
  it('is true when the actor is a strict superset of the target', () => {
    expect(dominates(set('a', 'b', 'c'), set('a', 'b'))).toBe(true)
    expect(dominates(set('a'), set())).toBe(true)
  })

  it('is false for equal sets (peers cannot act on each other)', () => {
    expect(dominates(set('a', 'b'), set('a', 'b'))).toBe(false)
    expect(dominates(set(), set())).toBe(false)
  })

  it('is false when the target holds something the actor lacks (lower acting on higher)', () => {
    expect(dominates(set('a', 'b'), set('a', 'b', 'c'))).toBe(false)
  })

  it('is false for incomparable sets (disjoint extras → fail-safe block)', () => {
    expect(dominates(set('a', 'x'), set('a', 'y'))).toBe(false)
    expect(dominates(set('x'), set('y'))).toBe(false)
  })

  it('is false when the actor is larger but still misses a target key (incomparable)', () => {
    // actor.size > target.size, yet the actor lacks 'x' the target holds — bigger does
    // NOT mean dominant. (Guards against deciding the hierarchy by raw permission count.)
    expect(dominates(set('a', 'b', 'c'), set('a', 'x'))).toBe(false)
  })

  it('reproduces the default role chain owner ⊋ admin ⊋ moderator ⊋ user', () => {
    const user = set('post.create', 'comment.create')
    const moderator = set('post.create', 'comment.create', 'content.moderate', 'user.disable')
    const admin = set(
      'post.create',
      'comment.create',
      'content.moderate',
      'user.disable',
      'user.delete.any',
      'role.manage',
    )
    // owner = full catalog (modelled here as a superset of everything used above)
    const owner = new Set<PermissionKey>([...admin, 'network.statistics.read'] as PermissionKey[])

    expect(dominates(admin, moderator)).toBe(true)
    expect(dominates(moderator, user)).toBe(true)
    expect(dominates(admin, user)).toBe(true)
    expect(dominates(owner, admin)).toBe(true)

    // and not the other way around
    expect(dominates(moderator, admin)).toBe(false)
    expect(dominates(user, moderator)).toBe(false)
    expect(dominates(admin, owner)).toBe(false)
    // two owners (equal full catalog) cannot act on each other
    expect(dominates(owner, new Set(owner))).toBe(false)
  })
})
