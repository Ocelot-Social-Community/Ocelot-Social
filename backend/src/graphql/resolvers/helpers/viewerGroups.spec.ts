import { describe, expect, it, vi } from 'vitest'

import { groupReadScope, moderatorGroupTypes, viewerScope } from './viewerGroups'

import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'

const contextHolding = (...permissions: string[]) =>
  ({ effectivePermissions: new Set(permissions as PermissionKey[]) }) as unknown as Context

// One row per membership, the shape the scope query returns.
const membershipRow = (groupId: string, roleName: string, permissions: string | null) => ({
  get: (key: string) => ({ groupId, roleName, permissions })[key as 'groupId'],
})

const contextWithMemberships = (
  rows: ReturnType<typeof membershipRow>[],
  permissions: string[] = [],
) =>
  ({
    user: { id: 'viewer' },
    effectivePermissions: new Set(permissions as PermissionKey[]),
    database: { query: vi.fn().mockResolvedValue({ records: rows }) },
  }) as unknown as Context

describe(moderatorGroupTypes, () => {
  it('is empty without a network right, because `public` is the group`s own statement now', () => {
    // It used to start at ['public']: the type WAS the statement "strangers may read this".
    // That statement is the group's `group.content.read` for non-members today, so keeping
    // public in here would let the type override a public group that closed its content.
    expect(moderatorGroupTypes(contextHolding())).toEqual([])
  })

  it('adds the types a network right covers', () => {
    // The fix for #9405: a moderator brings the closed type along, so the content they are
    // asked to review stops being invisible to them.
    expect(moderatorGroupTypes(contextHolding('group.content.read.any_closed'))).toEqual(['closed'])
    expect(
      moderatorGroupTypes(
        contextHolding('group.content.read.any_closed', 'group.content.read.any_hidden'),
      ),
    ).toEqual(['closed', 'hidden'])
  })

  it('does not let the hidden right alone open closed groups, or the other way round', () => {
    // Two separate rights, because an unlisted group is the stricter case — that distinction
    // would be lost if one implied the other.
    expect(moderatorGroupTypes(contextHolding('group.content.read.any_hidden'))).toEqual(['hidden'])
  })

  it('ignores rights that are about something else', () => {
    expect(
      moderatorGroupTypes(contextHolding('content.moderate', 'group.administer.any_closed')),
    ).toEqual([])
  })
})

describe(groupReadScope, () => {
  it('asks nothing for an anonymous visitor, who holds no membership', async () => {
    const context = { user: null } as unknown as Context

    expect(await groupReadScope(context)).toEqual({ readableGroupIds: [], contentGroupIds: [] })
  })

  it('separates the profile from the content, because a role may grant either', async () => {
    const context = contextWithMemberships([
      membershipRow('both', 'usual', '["group.read","group.content.read"]'),
      membershipRow('profile-only', 'pending', '["group.read"]'),
      membershipRow('content-only', 'reader', '["group.content.read"]'),
      membershipRow('nothing', 'muted', '[]'),
    ])

    expect(await groupReadScope(context)).toEqual({
      readableGroupIds: ['both', 'profile-only'],
      contentGroupIds: ['both', 'content-only'],
    })
  })

  it('expands the owner role, which stores nothing and means everything', async () => {
    // The owner role keeps an EMPTY stored list on purpose, so a newly added key is owned
    // automatically. Reading that list literally would hide an owner's own group from them —
    // which is exactly what happened before this went through permissionsForGroupRole.
    const context = contextWithMemberships([membershipRow('mine', 'owner', '[]')])

    expect(await groupReadScope(context)).toEqual({
      readableGroupIds: ['mine'],
      contentGroupIds: ['mine'],
    })
  })

  it('falls back to the pre-rights behaviour for a role with no definition', async () => {
    // A group that predates the roles, or a half-applied migration. The empty set would be the
    // shield's answer; here it would take a group's content away from the people in it, so the
    // fallback is what a membership meant before: an applicant sees the group, a member also
    // sees its content.
    const context = contextWithMemberships([
      membershipRow('unseeded', 'usual', null),
      membershipRow('unseeded-applicant', 'pending', null),
    ])

    expect(await groupReadScope(context)).toEqual({
      readableGroupIds: ['unseeded', 'unseeded-applicant'],
      contentGroupIds: ['unseeded'],
    })
  })

  it('reads a damaged permission list as no rights', async () => {
    const context = contextWithMemberships([membershipRow('broken', 'usual', '["group.read"')])

    expect(await groupReadScope(context)).toEqual({
      readableGroupIds: [],
      contentGroupIds: [],
    })
  })
})

describe(viewerScope, () => {
  it('carries the viewer, their content groups and the types a right opens', async () => {
    const context = contextWithMemberships(
      [membershipRow('mine', 'usual', '["group.read","group.content.read"]')],
      ['group.content.read.any_closed'],
    )

    expect(await viewerScope(context)).toEqual({
      viewerId: 'viewer',
      contentGroupIds: ['mine'],
      moderatorGroupTypes: ['closed'],
    })
  })

  it('is a constraining scope for an anonymous visitor, not an absent one', async () => {
    const context = { user: null, effectivePermissions: new Set() } as unknown as Context

    expect(await viewerScope(context)).toEqual({
      viewerId: null,
      contentGroupIds: [],
      moderatorGroupTypes: [],
    })
  })
})
