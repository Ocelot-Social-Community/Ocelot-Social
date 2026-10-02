import { describe, expect, it } from 'vitest'

import { visibilitiesWithNetworkAuthority, networkAuthorityIn } from './networkAuthority'

import type { PermissionKey } from '@src/permission'

const holding = (...keys: string[]) => new Set(keys as PermissionKey[])

describe(networkAuthorityIn, () => {
  it('folds the whole catalog in for an administrator of that type', () => {
    // The recovery path for an ownerless group needs everything an owner has.
    const authority = networkAuthorityIn('hidden', holding('group.administer.any_hidden'))

    expect(authority.has('group.role.manage')).toBe(true)
    expect(authority.has('group.read')).toBe(true)
  })

  it('folds only the reading rights in for a content reader', () => {
    const authority = networkAuthorityIn('closed', holding('group.content.read.any_closed'))

    expect([...authority].sort()).toEqual([
      'group.content.read',
      'group.members.read',
      'group.read',
    ])
  })

  it('takes the reading rights along with moderation, because blind moderation is useless', () => {
    const authority = networkAuthorityIn('hidden', holding('group.moderate.any_hidden'))

    expect(authority.has('group.post.moderate')).toBe(true)
    expect(authority.has('group.read')).toBe(true)
    expect(authority.has('group.content.read')).toBe(true)
  })

  it('grants nothing in a type the viewer holds nothing for', () => {
    expect(networkAuthorityIn('hidden', holding('group.administer.any_closed')).size).toBe(0)
    expect(networkAuthorityIn('closed', holding()).size).toBe(0)
  })
})

describe(visibilitiesWithNetworkAuthority, () => {
  it('answers in types, which is the form a many-groups query can use', () => {
    const effective = holding('group.administer.any_hidden', 'group.content.read.any_closed')

    expect(visibilitiesWithNetworkAuthority('group.read', effective)).toEqual(['closed', 'hidden'])
    // Administering folds everything; reading content does not reach role management.
    expect(visibilitiesWithNetworkAuthority('group.role.manage', effective)).toEqual(['hidden'])
  })

  it('is empty for somebody holding no network authority over groups', () => {
    expect(visibilitiesWithNetworkAuthority('group.read', holding('post.create'))).toEqual([])
  })
})
