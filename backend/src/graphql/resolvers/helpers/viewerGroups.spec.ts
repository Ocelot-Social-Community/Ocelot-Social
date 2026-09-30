import { describe, it, expect } from 'vitest'

import { readableGroupTypes } from './viewerGroups'

import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'

const contextHolding = (...permissions: string[]) =>
  ({ effectivePermissions: new Set(permissions as PermissionKey[]) }) as unknown as Context

describe(readableGroupTypes, () => {
  it('always includes public, which is open to everybody', () => {
    expect(readableGroupTypes(contextHolding())).toEqual(['public'])
  })

  it('adds the types a network right covers', () => {
    // The fix for #9405: a moderator brings the closed type along, so the content they are
    // asked to review stops being invisible to them.
    expect(readableGroupTypes(contextHolding('group.content.read.any_closed'))).toEqual([
      'public',
      'closed',
    ])
    expect(
      readableGroupTypes(
        contextHolding('group.content.read.any_closed', 'group.content.read.any_hidden'),
      ),
    ).toEqual(['public', 'closed', 'hidden'])
  })

  it('does not let the hidden right alone open closed groups, or the other way round', () => {
    // Two separate rights, because an unlisted group is the stricter case — that distinction
    // would be lost if one implied the other.
    expect(readableGroupTypes(contextHolding('group.content.read.any_hidden'))).toEqual([
      'public',
      'hidden',
    ])
  })

  it('ignores rights that are about something else', () => {
    expect(
      readableGroupTypes(contextHolding('content.moderate', 'group.administer.any_closed')),
    ).toEqual(['public'])
  })
})
