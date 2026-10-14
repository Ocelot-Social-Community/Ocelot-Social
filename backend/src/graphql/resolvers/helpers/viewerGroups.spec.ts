import { describe, expect, it, vi } from 'vitest'

import { elevatedReadScope, groupReadScope, viewerScope } from './viewerGroups'

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

// What the elevation query sees: an `ELEVATED_IN` lookup answers with these group ids, the
// membership lookup with nothing.
const contextElevatedIn = (groupIds: string[], ...permissions: string[]) => {
  const query = vi.fn(async ({ query: statement }: { query: string }) =>
    Promise.resolve({
      records: statement.includes('ELEVATED_IN')
        ? groupIds.map((groupId) => ({ get: () => groupId }))
        : [],
    }),
  )
  return {
    context: {
      user: { id: 'viewer' },
      effectivePermissions: new Set(permissions as PermissionKey[]),
      database: { query },
    } as unknown as Context,
    query,
  }
}

describe(elevatedReadScope, () => {
  it('asks nothing for an anonymous visitor', async () => {
    const context = contextHolding('group.content.read.any_hidden')

    expect(await elevatedReadScope(context)).toEqual([])
  })

  it('asks nothing of a viewer whose network rights read into no group', async () => {
    // Everybody but the moderators and admins: an elevation without a right to read with it
    // opens nothing, so the lookup is not worth a round trip.
    const { context, query } = contextElevatedIn(['g1'], 'content.moderate', 'post.create')

    expect(await elevatedReadScope(context)).toEqual([])
    expect(query).not.toHaveBeenCalled()
  })

  it('answers with the groups the viewer elevated in, not with the types a right covers', async () => {
    // #10506: the right alone used to open every group of its type, in every list.
    const { context, query } = contextElevatedIn(['g1', 'g2'], 'group.content.read.any_hidden')

    expect(await elevatedReadScope(context)).toEqual(['g1', 'g2'])
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { userId: 'viewer', visibilities: ['hidden'] },
      }),
    )
  })

  it('only counts a live elevation in a group the right still covers', async () => {
    // Both halves in the query: the elevation outlives a right withdrawn from the role, and a
    // group can turn hidden while it runs.
    const { context, query } = contextElevatedIn([], 'group.moderate.any_closed')
    await elevatedReadScope(context)

    const [[{ query: cypher }]] = query.mock.calls

    expect(cypher).toContain('e.expiresAt > datetime()')
    expect(cypher).toContain('IN $visibilities')
  })
})

describe(groupReadScope, () => {
  it('asks nothing for an anonymous visitor, who holds no membership', async () => {
    const context = { user: null } as unknown as Context

    expect(await groupReadScope(context)).toEqual({
      readableGroupIds: [],
      contentGroupIds: [],
      readableVisibilities: [],
    })
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
      // No network right in this context, so nothing comes from that direction.
      readableVisibilities: [],
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
      readableVisibilities: [],
    })
  })

  it('grants nothing for a role the group does not define', async () => {
    // The same answer the shield gives such a membership, rather than a second and more
    // generous one. It used to fall back to the pre-rights behaviour for a database
    // mid-migration; the boot repair (seedRolesForGroupsWithoutRoles) removes that state
    // instead, which beats two layers disagreeing about what a broken row means.
    const context = contextWithMemberships([
      membershipRow('unseeded', 'usual', null),
      membershipRow('unseeded-applicant', 'pending', null),
    ])

    expect(await groupReadScope(context)).toEqual({
      readableGroupIds: [],
      contentGroupIds: [],
      readableVisibilities: [],
    })
  })

  it('reads a damaged permission list as no rights', async () => {
    const context = contextWithMemberships([membershipRow('broken', 'usual', '["group.read"')])

    expect(await groupReadScope(context)).toEqual({
      readableGroupIds: [],
      contentGroupIds: [],
      readableVisibilities: [],
    })
  })
})

describe(viewerScope, () => {
  it('carries the viewer, their content groups and the groups they elevated in', async () => {
    const query = vi.fn(async ({ query: statement }: { query: string }) =>
      Promise.resolve({
        records: statement.includes('ELEVATED_IN')
          ? [{ get: () => 'elevated' }]
          : [membershipRow('mine', 'usual', '["group.read","group.content.read"]')],
      }),
    )
    const context = {
      user: { id: 'viewer' },
      effectivePermissions: new Set(['group.content.read.any_closed'] as PermissionKey[]),
      database: { query },
    } as unknown as Context

    expect(await viewerScope(context)).toEqual({
      viewerId: 'viewer',
      contentGroupIds: ['mine'],
      elevatedGroupIds: ['elevated'],
    })
  })

  it('is a constraining scope for an anonymous visitor, not an absent one', async () => {
    const context = { user: null, effectivePermissions: new Set() } as unknown as Context

    expect(await viewerScope(context)).toEqual({
      viewerId: null,
      contentGroupIds: [],
      elevatedGroupIds: [],
    })
  })
})
