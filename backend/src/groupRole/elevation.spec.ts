import { describe, expect, it } from 'vitest'

import { ELEVATION_MINUTES, UNELEVATED_NETWORK_RIGHTS, withElevation } from './elevation'

import type { GroupPermissionKey } from '@src/groupPermission'

const authority = (...keys: string[]) => new Set(keys as GroupPermissionKey[])

describe(withElevation, () => {
  it('leaves a network right at finding the group until it is picked up', () => {
    // What `group.administer.any_*` folds in is everything an owner has. Holding it is not the
    // same as using it: without the ask, it finds the group and nothing more.
    const full = authority('group.read', 'group.content.read', 'group.role.manage')

    expect([...withElevation(full, false)]).toEqual(['group.read'])
  })

  it('does not read the content or the members of a group without the ask (#10506)', () => {
    // What `group.content.read.any_*` folds in: a moderator holding it is a reader of every such
    // group only once they say so, group by group.
    const reader = authority('group.read', 'group.content.read', 'group.members.read')

    expect([...withElevation(reader, false)]).toEqual(['group.read'])
    expect(withElevation(reader, true)).toEqual(reader)
  })

  it('hands over what the rights fold in once it is', () => {
    const full = authority('group.read', 'group.role.manage', 'group.settings.manage')

    expect(withElevation(full, true)).toEqual(full)
  })

  it('keeps the group findable, which is where the elevation is offered', () => {
    const finder = authority(...UNELEVATED_NETWORK_RIGHTS)

    expect(withElevation(finder, false)).toEqual(finder)
  })

  it('answers with a set of its own, not the one it was handed', () => {
    const full = authority('group.read')

    expect(withElevation(full, true)).not.toBe(full)
  })
})

describe('the elevation window', () => {
  it('is long enough to work in and short enough to end by itself', () => {
    expect(ELEVATION_MINUTES).toBeGreaterThanOrEqual(15)
    expect(ELEVATION_MINUTES).toBeLessThanOrEqual(240)
  })
})
