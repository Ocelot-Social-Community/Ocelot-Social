import { describe, expect, it, vi } from 'vitest'

import { createGroupAuthorizationScope } from './requestScope'

import type { PermissionKey } from '@src/permission'

// A database that answers each statement by its shape. The scope sends five different
// statements and the interesting behaviour is WHICH of them it sends (and how often), so a fake
// shows more here than a seeded database would — and it shows it without one.
const rows = (values: Record<string, unknown>) => ({
  get: (key: string) => values[key], // eslint-disable-line security/detect-object-injection -- test fixture, keys are literals
})

interface GroupRow {
  [key: string]: unknown
  visibility?: string
  roleName?: string
  name?: string | null
  label?: string | null
  system?: boolean
  protected?: boolean
  permissions?: string | null
}

const fakeDatabase = (answers: {
  group?: GroupRow | null
  memberRole?: GroupRow | null
  role?: GroupRow | null
  groupOfPost?: string | null
  groupOfRoom?: string | null
}) => {
  const queries: string[] = []
  const query = vi.fn(async ({ query: statement }: { query: string }) => {
    queries.push(statement)
    // Discriminated by what each statement RETURNS: three of them share the same MATCH, so
    // matching on the pattern would answer the wrong question.
    // The visibility is an expression now, not a column, so the authorization query is
    // recognised by what it returns ALONGSIDE it.
    if (statement.includes('AS visibility') && statement.includes('AS elevated')) {
      return Promise.resolve({ records: answers.group ? [rows(answers.group)] : [] })
    }
    if (statement.includes('RETURN roleName AS roleName, r.name AS name')) {
      return Promise.resolve({ records: answers.memberRole ? [rows(answers.memberRole)] : [] })
    }
    if (statement.includes('RETURN r.name AS name, r.protected AS protected')) {
      return Promise.resolve({ records: answers.role ? [rows(answers.role)] : [] })
    }
    if (statement.includes('RETURN coalesce(m.role, $noneRole) AS roleName')) {
      return Promise.resolve({
        records: answers.memberRole ? [rows({ roleName: answers.memberRole.roleName })] : [],
      })
    }
    if (statement.includes('(p:Post {id: $postId})')) {
      return Promise.resolve({
        records: answers.groupOfPost ? [rows({ groupId: answers.groupOfPost })] : [],
      })
    }
    if (statement.includes('(:Room {id: $roomId})')) {
      return Promise.resolve({
        records: answers.groupOfRoom ? [rows({ groupId: answers.groupOfRoom })] : [],
      })
    }
    return Promise.resolve({ records: [] })
  })
  return { queries, database: { query } as never }
}

const scopeFor = (
  answers: Parameters<typeof fakeDatabase>[0],
  options: { userId?: string | null; network?: string[]; groupsEnabled?: boolean } = {},
) => {
  const fake = fakeDatabase(answers)
  const scope = createGroupAuthorizationScope({
    database: fake.database,
    userId: options.userId ?? 'viewer',
    effectivePermissions: new Set((options.network ?? []) as PermissionKey[]),
    policy: {
      getEffective: (key: string) =>
        key === 'groupsEnabled' ? (options.groupsEnabled ?? true) : true,
    },
  })
  return { ...fake, scope }
}

const memberOf = (permissions: string[], visibility = 'public') => ({
  group: {
    visibility,
    roleName: 'usual',
    name: 'usual',
    label: null,
    system: true,
    protected: false,
    permissions: JSON.stringify(permissions),
  },
})

describe(createGroupAuthorizationScope, () => {
  describe('forGroup', () => {
    it('answers null for a group that does not exist', async () => {
      const { scope } = scopeFor({ group: null })

      expect(await scope.forGroup('nope')).toBeNull()
    })

    it('resolves what the viewer`s role grants', async () => {
      const { scope } = scopeFor(memberOf(['group.read', 'group.post.create']))
      const authorization = await scope.forGroup('g1')

      expect(authorization?.roleName).toBe('usual')
      expect(authorization?.isMember).toBe(true)
      expect(authorization?.hasRoleDefinition).toBe(true)
      expect(authorization?.has('group.read')).toBe(true)
      expect(authorization?.has('group.post.pin')).toBe(false)
    })

    it('asks the database once per group and per request', async () => {
      // The memo is the reason a mutation can ask the same question in the shield and again in
      // the resolver without paying for it twice.
      const { scope, queries } = scopeFor(memberOf(['group.read']))
      await scope.forGroup('g1')
      await scope.forGroup('g1')

      expect(queries).toHaveLength(1)
    })

    it('reads a viewer with no membership as the group`s non-member role', async () => {
      const { scope } = scopeFor({
        group: {
          visibility: 'closed',
          roleName: 'none',
          name: 'none',
          protected: false,
          permissions: '["group.read","group.join.request"]',
        },
      })
      const authorization = await scope.forGroup('g1')

      expect(authorization?.isMember).toBe(false)
      expect(authorization?.has('group.join.request')).toBe(true)
    })

    it('grants nothing but leaving for a membership whose role the group does not define', async () => {
      // The escape hatch: everything fails closed there, and LeaveGroup is checked like any
      // other right — without this, a damaged row would mean a group nobody can get out of.
      const { scope } = scopeFor({
        group: { visibility: 'public', roleName: 'usual', name: null, permissions: null },
      })
      const authorization = await scope.forGroup('g1')

      expect(authorization?.hasRoleDefinition).toBe(false)
      expect(authorization?.has('group.leave')).toBe(true)
      expect(authorization?.has('group.read')).toBe(false)
    })

    it('does not hand that escape to somebody without a membership', async () => {
      const { scope } = scopeFor({
        group: { visibility: 'public', roleName: 'none', name: null, permissions: null },
      })
      const authorization = await scope.forGroup('g1')

      expect(authorization?.hasRoleDefinition).toBe(false)
      expect(authorization?.has('group.leave')).toBe(false)
      expect(authorization?.has('group.join')).toBe(false)
    })

    it('expands the owner role to the whole catalog', async () => {
      const { scope } = scopeFor({
        group: {
          visibility: 'hidden',
          roleName: 'owner',
          name: 'owner',
          protected: true,
          permissions: '[]',
        },
      })
      const authorization = await scope.forGroup('g1')

      expect(authorization?.has('group.role.manage')).toBe(true)
      expect(authorization?.has('group.settings.manage')).toBe(true)
    })

    it('drops every group right while the groups feature is switched off', async () => {
      const { scope } = scopeFor(memberOf(['group.read', 'group.post.create']), {
        groupsEnabled: false,
      })
      const authorization = await scope.forGroup('g1')

      expect([...(authorization?.effective ?? [])]).toEqual([])
    })

    it('caps a group right by the network right it requires', async () => {
      // group.post.create requires post.create network-wide, so a group cannot grant its way
      // around a right the network took away.
      const { scope } = scopeFor(memberOf(['group.post.create']), { network: [] })
      const capped = await scope.forGroup('g1')

      expect(capped?.has('group.post.create')).toBe(false)

      const { scope: allowed } = scopeFor(memberOf(['group.post.create']), {
        network: ['post.create'],
      })

      expect((await allowed.forGroup('g1'))?.has('group.post.create')).toBe(true)
    })

    it('leaves a network-wide group right at reading until it is picked up', async () => {
      // `group.administer.any_<visibility>` is the recovery path for a group left without an
      // owner — and a quiet power over every group of that kind until somebody asks for it
      // (groupRole/elevation.ts). Unelevated, it reads; that is all.
      const { scope } = scopeFor(
        {
          group: { visibility: 'closed', roleName: 'none', name: 'none', permissions: '[]' },
        },
        { network: ['group.administer.any_closed'] },
      )
      const authorization = await scope.forGroup('g1')

      expect(authorization?.has('group.settings.manage')).toBe(false)
      expect(authorization?.has('group.read')).toBe(true)
      // …and the page can say so, instead of showing a control that would be refused.
      expect(authorization?.mayElevate).toBe(true)
      expect(authorization?.elevated).toBe(false)
      // Holding the right is not standing above the members yet — that, too, waits for the ask.
      expect(authorization?.administersByNetwork).toBe(true)
      expect(authorization?.outranksMembers).toBe(false)
    })

    it('offers nothing to somebody whose membership already grants it all', async () => {
      // An owner holds the whole catalog through their membership, so picking the network
      // right up would add nothing — and an offer that changes nothing is noise.
      const { scope } = scopeFor(
        {
          group: {
            visibility: 'closed',
            roleName: 'owner',
            name: 'owner',
            protected: true,
            permissions: '[]',
          },
        },
        { network: ['group.administer.any_closed'] },
      )
      const authorization = await scope.forGroup('g1')

      expect(authorization?.has('group.settings.manage')).toBe(true)
      expect(authorization?.mayElevate).toBe(false)
    })

    it('hands the folded rights over once the viewer has picked them up', async () => {
      const { scope } = scopeFor(
        {
          group: {
            visibility: 'closed',
            roleName: 'none',
            name: 'none',
            permissions: '[]',
            elevated: true,
          },
        },
        { network: ['group.administer.any_closed'] },
      )
      const authorization = await scope.forGroup('g1')

      expect(authorization?.has('group.settings.manage')).toBe(true)
      expect(authorization?.sourceOf('group.settings.manage')).toBe('network')
      expect(authorization?.elevated).toBe(true)
      // …and with them in hand there is nothing left to offer.
      expect(authorization?.mayElevate).toBe(false)
      // Above every member now, owners included — the way to hand a group back from its owner.
      expect(authorization?.outranksMembers).toBe(true)
    })

    it('folds the moderator`s read rights in for a visibility they may read into', async () => {
      // #9405: a moderator sees what they are asked to review, and nothing more — reading, not
      // posting, not administering.
      const { scope } = scopeFor(
        {
          group: { visibility: 'closed', roleName: 'none', name: 'none', permissions: '[]' },
        },
        { network: ['group.content.read.any_closed'] },
      )
      const authorization = await scope.forGroup('g1')

      expect(authorization?.has('group.content.read')).toBe(true)
      expect(authorization?.has('group.members.read')).toBe(true)
      expect(authorization?.has('group.post.create')).toBe(false)
      expect(authorization?.has('group.settings.manage')).toBe(false)
    })

    it('brings the read rights along with the moderation right', async () => {
      // Moderating without reading would be blind — and taking a post out is an ACT, so it
      // waits for the elevation while the reading does not.
      const { scope } = scopeFor(
        {
          group: {
            visibility: 'hidden',
            roleName: 'none',
            name: 'none',
            permissions: '[]',
            elevated: true,
          },
        },
        { network: ['group.moderate.any_hidden'] },
      )
      const authorization = await scope.forGroup('g1')

      expect(authorization?.has('group.post.moderate')).toBe(true)
      expect(authorization?.has('group.content.read')).toBe(true)
      expect(authorization?.has('group.read')).toBe(true)
      expect(authorization?.has('group.members.read')).toBe(false)
      // Moderating is not administering: elevated, but nobody's superior.
      expect(authorization?.outranksMembers).toBe(false)
    })

    it('does not fold anything in for a DIFFERENT visibility', async () => {
      const { scope } = scopeFor(
        {
          group: { visibility: 'hidden', roleName: 'none', name: 'none', permissions: '[]' },
        },
        { network: ['group.content.read.any_closed', 'group.moderate.any_closed'] },
      )

      expect([...((await scope.forGroup('g1'))?.effective ?? [])]).toEqual([])
    })

    it('says where a right comes from', async () => {
      const { scope } = scopeFor(memberOf(['group.read']))
      const authorization = await scope.forGroup('g1')

      expect(authorization?.sourceOf('group.read')).toBe('membership')
      expect(authorization?.sourceOf('group.role.manage')).toBeNull()
    })
  })

  describe('forPost / forRoom', () => {
    it('resolves the group a post is in', async () => {
      const { scope } = scopeFor({ ...memberOf(['group.read']), groupOfPost: 'g1' })

      expect((await scope.forPost('p1'))?.groupId).toBe('g1')
    })

    it('answers null for a post in no group', async () => {
      const { scope } = scopeFor({ groupOfPost: null })

      expect(await scope.forPost('p1')).toBeNull()
    })

    it('resolves the group a chat room belongs to', async () => {
      const { scope } = scopeFor({ ...memberOf(['group.chat.participate']), groupOfRoom: 'g1' })

      expect((await scope.forRoom('r1'))?.has('group.chat.participate')).toBe(true)
    })

    it('answers null for a direct-message room', async () => {
      const { scope } = scopeFor({ groupOfRoom: null })

      expect(await scope.forRoom('r1')).toBeNull()
    })

    it('looks a post up once per request', async () => {
      const { scope, queries } = scopeFor({ ...memberOf(['group.read']), groupOfPost: 'g1' })
      await scope.forPost('p1')
      await scope.forPost('p1')

      // One lookup for the post, one for the group it is in.
      expect(queries).toHaveLength(2)
    })
  })

  describe('the act-on side', () => {
    it('reads another member`s role name', async () => {
      const { scope } = scopeFor({ memberRole: { roleName: 'admin' } })

      expect(await scope.forGroupMemberRole('g1', 'other')).toBe('admin')
    })

    it('reads a non-member as `none`', async () => {
      const { scope } = scopeFor({ memberRole: null })

      expect(await scope.forGroupMemberRole('g1', 'other')).toBe('none')
    })

    it('resolves what another member holds', async () => {
      const { scope } = scopeFor({
        ...memberOf(['group.read']),
        memberRole: { roleName: 'admin', name: 'admin', permissions: '["group.post.pin"]' },
      })

      expect([...(await scope.memberPermissions('g1', 'other'))]).toEqual(['group.post.pin'])
    })

    it('resolves nothing for a member of a group that does not exist', async () => {
      const { scope } = scopeFor({ group: null, memberRole: { roleName: 'admin' } })

      expect([...(await scope.memberPermissions('nope', 'other'))]).toEqual([])
    })

    it('resolves nothing when the member row is missing', async () => {
      const { scope } = scopeFor({ ...memberOf(['group.read']), memberRole: null })

      expect([...(await scope.memberPermissions('g1', 'other'))]).toEqual([])
    })

    it('resolves what a named role would grant', async () => {
      const { scope } = scopeFor({
        ...memberOf(['group.read']),
        role: { name: 'admin', protected: false, permissions: '["group.post.pin"]' },
      })

      expect([...((await scope.rolePermissions('g1', 'admin')) ?? [])]).toEqual(['group.post.pin'])
    })

    it('answers null for a role the group does not have', async () => {
      const { scope } = scopeFor({ ...memberOf(['group.read']), role: null })

      expect(await scope.rolePermissions('g1', 'ghost')).toBeNull()
    })

    it('answers null for a role of a group that does not exist', async () => {
      const { scope } = scopeFor({ group: null, role: { name: 'admin', permissions: '[]' } })

      expect(await scope.rolePermissions('nope', 'admin')).toBeNull()
    })

    it('answers null for a row without a name', async () => {
      const { scope } = scopeFor({
        ...memberOf(['group.read']),
        role: { name: null, permissions: '[]' },
      })

      expect(await scope.rolePermissions('g1', 'admin')).toBeNull()
    })

    it('expands a protected role to the whole catalog, so assigning it needs everything', async () => {
      const { scope } = scopeFor({
        ...memberOf(['group.read']),
        role: { name: 'owner', protected: true, permissions: '[]' },
      })
      const assigned = (await scope.rolePermissions('g1', 'owner')) ?? new Set()

      expect(assigned.has('group.role.manage')).toBe(true)
    })
  })

  describe('an anonymous viewer', () => {
    it('resolves the group`s non-member role', async () => {
      const { scope } = scopeFor(
        {
          group: {
            visibility: 'public',
            roleName: 'none',
            name: 'none',
            permissions: '["group.read","group.join"]',
          },
        },
        { userId: null },
      )
      const authorization = await scope.forGroup('g1')

      expect(authorization?.has('group.join')).toBe(true)
      expect(authorization?.isMember).toBe(false)
    })
  })
})
