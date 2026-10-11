import { describe, expect, it } from 'vitest'

import { ELEVATION_MINUTES, UNELEVATED_NETWORK_RIGHTS, withElevation } from './elevation'

import type { GroupPermissionKey } from '@src/groupPermission'

const authority = (...keys: string[]) => new Set(keys as GroupPermissionKey[])

describe(withElevation, () => {
  it('leaves a network right at reading until it is picked up', () => {
    // What `group.administer.any_*` folds in is everything an owner has. Holding it is not the
    // same as using it: without the ask, it reads and nothing more.
    const full = authority('group.read', 'group.content.read', 'group.role.manage')

    expect([...withElevation(full, false)].sort()).toEqual(['group.content.read', 'group.read'])
  })

  it('hands over what the rights fold in once it is', () => {
    const full = authority('group.read', 'group.role.manage', 'group.settings.manage')

    expect(withElevation(full, true)).toEqual(full)
  })

  it('keeps the whole reading set, which is what moderation runs on', () => {
    // A report queue that asked for a confirmation per reported post would be answered by
    // clicking it away, so reading stays open.
    const reader = authority(...UNELEVATED_NETWORK_RIGHTS)

    expect(withElevation(reader, false)).toEqual(reader)
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
