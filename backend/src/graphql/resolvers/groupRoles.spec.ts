import { setTimeout as delay } from 'node:timers/promises'

import { PubSub } from 'graphql-subscriptions'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GROUP_PERMISSIONS_CHANGED } from '@constants/subscriptions'
import { UserInputError } from '@graphql/errors'
import {
  clearElevation,
  deleteGroupRole,
  markGroupRolesCustomized,
  memberCountsByRole,
  readElevation,
  readGroupRoles,
  readGroupRoleTemplates,
  renameGroupRole,
  replaceGroupRoles,
  readGroupTemplate,
  untouchedGroupIdsByTemplate,
  writeElevation,
  writeGroupRole,
  writeGroupRoleTemplate,
  writeGroupTemplate,
} from '@src/groupRole/repository'

import resolvers from './groupRoles'

import type { Context } from '@src/context'
import type { GroupRoleDefinition } from '@src/groupRole'
import type { PermissionKey } from '@src/permission'

// The repository is the seam: everything below it is Cypher, which repository.spec.ts covers
// against a fake driver of its own. Mocking it here leaves exactly this file's own decisions
// under test — validation, the coverage rule, the system-role guards, which statements the
// admin list builds — and makes every one of them assertable without a database.
vi.mock('@src/groupRole/repository', () => ({
  readGroupRoles: vi.fn(),
  readGroupRoleTemplates: vi.fn(),
  memberCountsByRole: vi.fn(),
  writeGroupRole: vi.fn(),
  renameGroupRole: vi.fn(),
  deleteGroupRole: vi.fn(),
  replaceGroupRoles: vi.fn(),
  markGroupRolesCustomized: vi.fn(),
  untouchedGroupIdsByTemplate: vi.fn(),
  readGroupTemplate: vi.fn(),
  writeGroupTemplate: vi.fn(),
  writeGroupRoleTemplate: vi.fn(),
  readElevation: vi.fn(),
  writeElevation: vi.fn(),
  clearElevation: vi.fn(),
}))

// The mocked repository, named once so the tests read as `mocked.writeGroupRole` rather than
// wrapping each call site in vi.mocked().
const mocked = {
  clearElevation: vi.mocked(clearElevation),
  deleteGroupRole: vi.mocked(deleteGroupRole),
  markGroupRolesCustomized: vi.mocked(markGroupRolesCustomized),
  memberCountsByRole: vi.mocked(memberCountsByRole),
  readElevation: vi.mocked(readElevation),
  readGroupRoles: vi.mocked(readGroupRoles),
  readGroupRoleTemplates: vi.mocked(readGroupRoleTemplates),
  renameGroupRole: vi.mocked(renameGroupRole),
  replaceGroupRoles: vi.mocked(replaceGroupRoles),
  untouchedGroupIdsByTemplate: vi.mocked(untouchedGroupIdsByTemplate),
  readGroupTemplate: vi.mocked(readGroupTemplate),
  writeGroupTemplate: vi.mocked(writeGroupTemplate),
  writeElevation: vi.mocked(writeElevation),
  writeGroupRole: vi.mocked(writeGroupRole),
  writeGroupRoleTemplate: vi.mocked(writeGroupRoleTemplate),
}

const role = (
  name: string,
  permissions: string[] = [],
  overrides: Partial<GroupRoleDefinition> = {},
): GroupRoleDefinition => ({
  name,
  label: null,
  system: false,
  protected: false,
  permissions: permissions as GroupRoleDefinition['permissions'],
  ...overrides,
})

const record = (values: Record<string, unknown>) => ({
  get: (key: string) => values[key], // eslint-disable-line security/detect-object-injection -- test fixture, literal keys
})

interface ContextOptions {
  user?: { id: string } | null
  network?: string[]
  authorization?: {
    visibility?: string
    roleName?: string
    effective?: string[]
    elevated?: boolean
    mayElevate?: boolean
  } | null
  queryRecords?: Array<ReturnType<typeof record>>
  writeRecords?: Array<ReturnType<typeof record>>
}

const contextFor = (options: ContextOptions = {}) => {
  const queries: Array<{ query: string; variables?: Record<string, unknown> }> = []
  const published: Array<{ event: string; payload: unknown }> = []
  const authorization =
    options.authorization === null
      ? null
      : {
          groupId: 'g1',
          visibility: options.authorization?.visibility ?? 'public',
          roleName: options.authorization?.roleName ?? 'admin',
          isMember: true,
          hasRoleDefinition: true,
          effective: new Set(options.authorization?.effective ?? []),
          has: (permission: string) =>
            new Set(options.authorization?.effective ?? []).has(permission),
          sourceOf: () => null,
          elevated: options.authorization?.elevated ?? false,
          mayElevate: options.authorization?.mayElevate ?? false,
        }
  const context = {
    user: options.user === undefined ? { id: 'actor' } : options.user,
    effectivePermissions: new Set((options.network ?? []) as PermissionKey[]),
    // `group.create_*` is gated by `groupsEnabled`, so without a policy reader the privacy cap
    // would answer "unavailable" and the gate rather than the cap would be under test.
    policy: { getEffective: () => true, get: () => true },
    database: {
      query: vi.fn(async (args: { query: string; variables?: Record<string, unknown> }) => {
        queries.push(args)
        return Promise.resolve({ records: options.queryRecords ?? [] })
      }),
      write: vi.fn(async (args: { query: string; variables?: Record<string, unknown> }) => {
        queries.push(args)
        return Promise.resolve({ records: options.writeRecords ?? [] })
      }),
    },
    groupAuthorization: { forGroup: vi.fn(async () => Promise.resolve(authorization)) },
    pubsub: {
      publish: vi.fn((event: string, payload: unknown) => {
        published.push({ event, payload })
      }),
    },
  } as unknown as Context
  return { context, queries, published }
}

const { Query, Group, Mutation } = resolvers

beforeEach(() => {
  vi.clearAllMocks()
  mocked.readGroupRoles.mockResolvedValue([])
  mocked.readGroupRoleTemplates.mockResolvedValue({})
  mocked.memberCountsByRole.mockResolvedValue(new Map())
  mocked.untouchedGroupIdsByTemplate.mockResolvedValue(new Map())
})

// The shape untouchedGroupIdsByTemplate answers in: which groups an apply would reach, and how
// many there are of that type altogether.
const groupsOfTemplate = (untouchedIds: string[], total = untouchedIds.length) => ({
  untouchedIds,
  total,
})

describe('Query.groupPermissionCatalog', () => {
  it('hands out the whole catalog, which is the same for everybody', () => {
    const catalog = Query.groupPermissionCatalog()

    expect(catalog.length).toBeGreaterThan(0)
    expect(catalog[0]).toHaveProperty('key')
  })
})

describe('Query.adminGroups', () => {
  const administrator = { network: ['group.administer.any_public', 'group.administer.any_hidden'] }

  it('answers nothing to somebody who may administer no visibility', async () => {
    const { context, queries } = contextFor()

    expect(await Query.adminGroups({}, {}, context)).toEqual([])
    // Not even a query: the right IS the list, so there is nothing to ask for.
    expect(queries).toEqual([])
  })

  it('counts nothing for them either', async () => {
    const { context } = contextFor()

    expect(await Query.adminGroupCount({}, {}, context)).toBe(0)
  })

  it('restricts the types to the ones the viewer may administer', async () => {
    const { context, queries } = contextFor(administrator)

    await Query.adminGroups({}, {}, context)

    expect(queries[0].variables?.types).toEqual(['public', 'hidden'])
  })

  it('refuses a requested type the viewer may not administer', async () => {
    // Asking for the type directly must not be a way around the right — otherwise a hidden
    // group could be enumerated by anybody who guesses the filter.
    const { context, queries } = contextFor(administrator)

    expect(await Query.adminGroups({}, { visibility: 'closed' }, context)).toEqual([])
    expect(queries).toEqual([])
  })

  it('narrows to a single requested type', async () => {
    const { context, queries } = contextFor(administrator)

    await Query.adminGroups({}, { visibility: 'hidden' }, context)

    expect(queries[0].variables?.types).toEqual(['hidden'])
  })

  it('searches name and slug, case-insensitively', async () => {
    const { context, queries } = contextFor(administrator)

    await Query.adminGroups({}, { search: 'Yoga' }, context)

    expect(queries[0].query).toContain('toLower(g.name) CONTAINS toLower($search)')
    expect(queries[0].variables?.search).toBe('Yoga')
  })

  it('filters by the disabled flag in both directions', async () => {
    const { context, queries } = contextFor(administrator)

    await Query.adminGroups({}, { disabled: true }, context)
    await Query.adminGroups({}, { disabled: false }, context)

    expect(queries[0].query).toContain('coalesce(g.disabled, false) = $disabled')
    expect(queries[0].variables?.disabled).toBe(true)
    expect(queries[1].variables?.disabled).toBe(false)
  })

  it('finds the groups that have no owner left', async () => {
    // The reason this list exists: a group whose owner is gone cannot be administered from
    // inside any more, and nothing else surfaces it.
    const { context, queries } = contextFor(administrator)

    await Query.adminGroups({}, { ownerless: true }, context)

    expect(queries[0].query).toContain('ownerCount = 0')
  })

  it('leaves out the deleted ones and pages with defaults', async () => {
    const { context, queries } = contextFor(administrator)

    await Query.adminGroups({}, {}, context)

    expect(queries[0].query).toContain('coalesce(g.deleted, false) = false')
    expect(queries[0].variables).toMatchObject({ first: 25, offset: 0 })
  })

  it('takes the paging it is given', async () => {
    const { context, queries } = contextFor(administrator)

    await Query.adminGroups({}, { first: 10, offset: 20 }, context)

    expect(queries[0].variables).toMatchObject({ first: 10, offset: 20 })
  })

  it('returns the groups with their owner count', async () => {
    const { context } = contextFor({
      ...administrator,
      queryRecords: [record({ group: { id: 'g1', ownerCount: 0 } })],
    })

    expect(await Query.adminGroups({}, {}, context)).toEqual([{ id: 'g1', ownerCount: 0 }])
  })

  it('counts with the same filters', async () => {
    const { context, queries } = contextFor({
      ...administrator,
      queryRecords: [record({ count: '7' })],
    })

    expect(await Query.adminGroupCount({}, { search: 'yoga' }, context)).toBe(7)
    expect(queries[0].query).toContain('RETURN toString(count(g)) AS count')
  })

  it('counts zero when the count comes back empty', async () => {
    const { context } = contextFor({ ...administrator, queryRecords: [] })

    expect(await Query.adminGroupCount({}, {}, context)).toBe(0)
  })
})

describe('Query.groupRoleTemplates', () => {
  it('computes the visibility from the rights, not from the template`s name', async () => {
    // The two are separate fields because they answer separate questions. The mutation keeps
    // the shipped templates' names honest, but `visibility` is derived either way — a template
    // named `public` whose non-member role cannot read the content IS a closed one.
    mocked.readGroupRoleTemplates.mockResolvedValue({ public: [role('none', ['group.read'])] })
    mocked.untouchedGroupIdsByTemplate.mockResolvedValue(new Map())
    const { context } = contextFor()

    expect(await Query.groupRoleTemplates({}, {}, context)).toMatchObject([
      { name: 'public', visibility: 'closed' },
    ])
  })

  it('reports each template with its visibility, roles and share of groups', async () => {
    // Deliberately handed over in the wrong order: the resolver sorts them by privacy level,
    // so the tabs read public → closed → secret instead of alphabetically.
    mocked.readGroupRoleTemplates.mockResolvedValue({
      hidden: [role('none')],
      public: [role('none', ['group.read', 'group.content.read'])],
    })
    mocked.untouchedGroupIdsByTemplate.mockResolvedValue(
      new Map([['public', groupsOfTemplate(['a', 'b'], 5)]]),
    )
    const { context } = contextFor()

    expect(await Query.groupRoleTemplates({}, {}, context)).toEqual([
      {
        // The template's name and what it derives to: two questions that happen to share an
        // answer for the three shipped templates.
        name: 'public',
        visibility: 'public',
        roles: [{ ...role('none', ['group.read', 'group.content.read']), memberCount: null }],
        untouchedGroupCount: 2,
        // Five public groups exist, two of them never edited their roles. Without the second
        // number "2" reads as "only 2", which is the misreading this answers.
        groupCount: 5,
      },
      {
        name: 'hidden',
        visibility: 'hidden',
        roles: [{ ...role('none'), memberCount: null }],
        // A template nobody uses answers 0 of 0, not null.
        untouchedGroupCount: 0,
        groupCount: 0,
      },
    ])
  })
})

describe('Query.groupTemplates', () => {
  it('names each template with what it makes a group, least private first', async () => {
    // `channel` is the reason this answers two fields rather than a list of names: it derives
    // to `public`, so making one costs group.create_public — which the name does not say. It is
    // also what broke the old ordering, which sorted the NAMES against the privacy levels and
    // so put a template that is not a visibility at index -1.
    mocked.readGroupRoleTemplates.mockResolvedValue({
      hidden: [role('none')],
      channel: [role('none', ['group.read', 'group.content.read'])],
      closed: [role('none', ['group.read'])],
    })
    const { context } = contextFor()

    const choices = await Query.groupTemplates({}, {}, context)

    expect(choices.map(({ name, visibility }) => ({ name, visibility }))).toEqual([
      { name: 'channel', visibility: 'public' },
      { name: 'closed', visibility: 'closed' },
      { name: 'hidden', visibility: 'hidden' },
    ])
  })

  it('carries each template`s roles, which no member holds', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({
      channel: [role('none', ['group.read', 'group.content.read'])],
    })
    const { context } = contextFor()

    const [channel] = await Query.groupTemplates({}, {}, context)

    expect(channel.roles).toEqual([
      { ...role('none', ['group.read', 'group.content.read']), memberCount: null },
    ])
  })
})

describe('Group.myGroupRole', () => {
  it('is null for a group that does not exist', async () => {
    const { context } = contextFor({ authorization: null })

    expect(await Group.myGroupRole({ id: 'g1' }, {}, context)).toBeNull()
  })

  it('is null for somebody with no membership', async () => {
    // `none` is a role in the model but not a membership, and every client asking means
    // "what am I here".
    const { context } = contextFor({ authorization: { roleName: 'none' } })

    expect(await Group.myGroupRole({ id: 'g1' }, {}, context)).toBeNull()
  })

  it('is null when the group has no definition for the role carried', async () => {
    const { context } = contextFor({ authorization: { roleName: 'ghost' } })
    mocked.readGroupRoles.mockResolvedValue([role('usual')])

    expect(await Group.myGroupRole({ id: 'g1' }, {}, context)).toBeNull()
  })

  it('answers the role, without counting its members', async () => {
    const { context } = contextFor({ authorization: { roleName: 'admin' } })
    mocked.readGroupRoles.mockResolvedValue([role('admin', ['group.invite'])])

    expect(await Group.myGroupRole({ id: 'g1' }, {}, context)).toEqual({
      ...role('admin', ['group.invite']),
      memberCount: null,
    })
    expect(mocked.memberCountsByRole).not.toHaveBeenCalled()
  })
})

describe('Group.myGroupPermissions', () => {
  it('is the effective set, which is what canInGroup() asks', async () => {
    const { context } = contextFor({ authorization: { effective: ['group.read'] } })

    expect(await Group.myGroupPermissions({ id: 'g1' }, {}, context)).toEqual(['group.read'])
  })

  it('is empty for a group that does not exist', async () => {
    const { context } = contextFor({ authorization: null })

    expect(await Group.myGroupPermissions({ id: 'g1' }, {}, context)).toEqual([])
  })
})

describe('Group.roles', () => {
  it('counts the members of each role, except of `none`', async () => {
    // Counting `none` would be counting everybody who ever looked at the group.
    mocked.readGroupRoles.mockResolvedValue([role('none'), role('usual'), role('admin')])
    mocked.memberCountsByRole.mockResolvedValue(new Map([['usual', 4]]))
    const { context } = contextFor()

    expect(await Group.roles({ id: 'g1' }, {}, context)).toEqual([
      { ...role('none'), memberCount: null },
      { ...role('usual'), memberCount: 4 },
      { ...role('admin'), memberCount: 0 },
    ])
  })
})

describe('Mutation.updateGroupRole', () => {
  const editor = { authorization: { effective: ['group.role.manage', 'group.invite'] } }

  it('refuses a role the group does not have', async () => {
    const { context } = contextFor(editor)

    await expect(
      Mutation.updateGroupRole({}, { groupId: 'g1', name: 'ghost', permissions: [] }, context),
    ).rejects.toThrow(UserInputError)
  })

  it('refuses to write a permission list onto the owner role', async () => {
    // It resolves to the whole catalog, so a stored list would only ever be a lie about what
    // it can do.
    mocked.readGroupRoles.mockResolvedValue([role('owner', [], { protected: true, system: true })])
    const { context } = contextFor(editor)

    await expect(
      Mutation.updateGroupRole(
        {},
        { groupId: 'g1', name: 'owner', permissions: ['group.read'] },
        context,
      ),
    ).rejects.toThrow('The owner role holds every right and cannot be edited!')
  })

  it('lets the owner role be relabelled', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('owner', [], { protected: true, system: true })])
    const { context, published } = contextFor(editor)

    const updated = await Mutation.updateGroupRole(
      {},
      { groupId: 'g1', name: 'owner', permissions: [], label: 'Founder' },
      context,
    )

    expect(updated).toMatchObject({ name: 'owner', label: 'Founder', memberCount: null })
    expect(mocked.markGroupRolesCustomized).toHaveBeenCalled()
    expect(published).toHaveLength(1)
  })

  it('refuses a label that is too long or badly spaced', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('admin')])
    const { context } = contextFor(editor)

    await expect(
      Mutation.updateGroupRole(
        {},
        { groupId: 'g1', name: 'admin', permissions: [], label: 'x'.repeat(65) },
        context,
      ),
    ).rejects.toThrow('Invalid role label!')
    await expect(
      Mutation.updateGroupRole(
        {},
        { groupId: 'g1', name: 'admin', permissions: [], label: ' padded ' },
        context,
      ),
    ).rejects.toThrow('Invalid role label!')
  })

  it('reads an empty label as none at all', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('admin')])
    const { context } = contextFor(editor)

    const updated = await Mutation.updateGroupRole(
      {},
      { groupId: 'g1', name: 'admin', permissions: [], label: '' },
      context,
    )

    expect(updated).toMatchObject({ label: null })
  })

  it('refuses to grant a right the actor does not hold themselves', async () => {
    // Otherwise group.role.manage would be a way to climb: write a right into your own role
    // and then use it.
    mocked.readGroupRoles.mockResolvedValue([role('admin')])
    const { context } = contextFor(editor)

    await expect(
      Mutation.updateGroupRole(
        {},
        { groupId: 'g1', name: 'admin', permissions: ['group.member.remove'] },
        context,
      ),
    ).rejects.toThrow('You cannot grant rights you do not hold yourself')
  })

  it('names the rights that blocked it, rather than leaving the reader to guess', async () => {
    // A right can be missing from the actor's EFFECTIVE set without being missing from their
    // role — the network cap takes `group.videoCall.create` away in a group whose door is
    // restricted. "You cannot grant rights you do not hold" then sends whoever reads it
    // looking in entirely the wrong place.
    mocked.readGroupRoles.mockResolvedValue([role('admin')])
    const { context } = contextFor(editor)

    await expect(
      Mutation.updateGroupRole(
        {},
        {
          groupId: 'g1',
          name: 'admin',
          permissions: ['group.member.remove', 'group.videoCall.create'],
        },
        context,
      ),
    ).rejects.toThrow('group.member.remove, group.videoCall.create')
  })

  it('lets an edit KEEP a right the actor cannot hold right now', async () => {
    // The case that made every role with a video-call right uneditable on a network without
    // LiveKit: the gate takes `group.videoCall.*` out of everybody's effective set, the whole
    // list goes back with the request, and a right that is merely staying put was read as one
    // being granted. Removing stays allowed, adding still is not.
    mocked.readGroupRoles.mockResolvedValue([
      role('usual', ['group.post.create', 'group.videoCall.create']),
    ])
    const { context } = contextFor({
      authorization: { effective: ['group.role.manage', 'group.post.create', 'group.leave'] },
    })

    await expect(
      Mutation.updateGroupRole(
        {},
        {
          groupId: 'g1',
          name: 'usual',
          // The gated right stays, posting goes, leaving arrives — all three within what the
          // actor may do.
          permissions: ['group.videoCall.create', 'group.leave'],
        },
        context,
      ),
      // Sanitised into catalog order on the way through, which is why `leave` reads first.
    ).resolves.toMatchObject({ permissions: ['group.leave', 'group.videoCall.create'] })
  })

  it('refuses when the actor holds nothing in that group at all', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('admin')])
    const { context } = contextFor({ authorization: null })

    await expect(
      Mutation.updateGroupRole(
        {},
        { groupId: 'g1', name: 'admin', permissions: ['group.read'] },
        context,
      ),
    ).rejects.toThrow('You cannot grant rights you do not hold yourself')
  })

  describe('the privacy cap on the non-member role (E10)', () => {
    // Editing `none` IS the type change now, because the type is derived from exactly the two
    // read rights on it. Without the cap, "create public, then take group.read away" would be
    // the way around `group.create_hidden`.
    const editorOf = (visibility: string, network: string[] = []) => ({
      authorization: {
        visibility,
        // Enough to COVER what the tests grant: the coverage rule is a separate guard, and a
        // missing right there would fail these for the wrong reason.
        effective: ['group.role.manage', 'group.read', 'group.content.read', 'group.members.read'],
      },
      network,
    })

    beforeEach(() => {
      mocked.readGroupRoles.mockResolvedValue([role('none', ['group.read', 'group.content.read'])])
    })

    it('refuses to unlist a public group without group.create_hidden', async () => {
      const { context } = contextFor(editorOf('public'))

      await expect(
        Mutation.updateGroupRole({}, { groupId: 'g1', name: 'none', permissions: [] }, context),
      ).rejects.toThrow('You cannot make this group more private than you may create one!')
    })

    it('allows it for somebody who may create hidden groups', async () => {
      const { context } = contextFor(editorOf('public', ['group.create_hidden']))

      await expect(
        Mutation.updateGroupRole({}, { groupId: 'g1', name: 'none', permissions: [] }, context),
      ).resolves.toMatchObject({ name: 'none', permissions: [] })
    })

    it('refuses to close a public group`s content without group.create_closed', async () => {
      const { context } = contextFor(editorOf('public'))

      await expect(
        Mutation.updateGroupRole(
          {},
          { groupId: 'g1', name: 'none', permissions: ['group.read'] },
          context,
        ),
      ).rejects.toThrow('more private')
    })

    it('judges the set that will be STORED, not the one that was ticked', async () => {
      // `group.content.read` alone derives to `hidden`, because the visibility asks for
      // `group.read` first — so before the implication ran ahead of the cap, opening a hidden
      // group's content was refused for making it MORE private. The implication adds
      // `group.read`, the cap sees `public`, and the edit is the opening it actually is.
      const { context } = contextFor(editorOf('hidden'))

      await expect(
        Mutation.updateGroupRole(
          {},
          { groupId: 'g1', name: 'none', permissions: ['group.content.read'] },
          context,
        ),
      ).resolves.toMatchObject({
        name: 'none',
        // The implication appends, so the stored order is the ask followed by what it dragged in.
        permissions: ['group.content.read', 'group.read'],
      })
    })

    it('lets anybody who may edit the roles OPEN a group up', async () => {
      // The other direction takes nothing away from people outside, and whoever may edit the
      // roles can see everything inside already.
      const { context } = contextFor(editorOf('hidden'))

      await expect(
        Mutation.updateGroupRole(
          {},
          { groupId: 'g1', name: 'none', permissions: ['group.read', 'group.content.read'] },
          context,
        ),
      ).resolves.toMatchObject({ name: 'none' })
    })

    it('asks for nothing when the level does not change', async () => {
      // A group editing what its non-member role may do WITHOUT touching the two read rights —
      // say the member list — must not need a creation right for that.
      const { context } = contextFor(editorOf('public'))

      await expect(
        Mutation.updateGroupRole(
          {},
          {
            groupId: 'g1',
            name: 'none',
            permissions: ['group.read', 'group.content.read', 'group.members.read'],
          },
          context,
        ),
      ).resolves.toMatchObject({ name: 'none' })
    })

    it('leaves every other role alone', async () => {
      // Only the non-member role decides visibility; editing `usual` is not a type change.
      mocked.readGroupRoles.mockResolvedValue([role('usual', ['group.read'])])
      const { context } = contextFor(editorOf('public'))

      await expect(
        Mutation.updateGroupRole({}, { groupId: 'g1', name: 'usual', permissions: [] }, context),
      ).resolves.toMatchObject({ name: 'usual' })
    })

    it('refuses for a group that is not there', async () => {
      const { context } = contextFor({ authorization: null })

      await expect(
        Mutation.updateGroupRole({}, { groupId: 'g1', name: 'none', permissions: [] }, context),
      ).rejects.toThrow(UserInputError)
    })
  })

  it('writes the sanitised list and counts the members of the role', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('admin')])
    mocked.memberCountsByRole.mockResolvedValue(new Map([['admin', 3]]))
    const { context } = contextFor(editor)

    const updated = await Mutation.updateGroupRole(
      {},
      { groupId: 'g1', name: 'admin', permissions: ['group.invite', 'group.teleport'] },
      context,
    )

    // The unknown key is dropped on the way in rather than stored and ignored later, and the
    // right the role cannot be without comes along (groupRole/mandatoryRights.ts).
    expect(updated).toMatchObject({
      permissions: ['group.invite', 'group.leave'],
      memberCount: 3,
    })
    expect(mocked.writeGroupRole).toHaveBeenCalledWith(
      context.database,
      'g1',
      expect.objectContaining({ name: 'admin', permissions: ['group.invite', 'group.leave'] }),
      'actor',
      expect.any(String),
    )
  })
})

// The resolver stays whole and tested — creating a group-defined role is parked in the SHIELD
// (#10356), which is the one line to take back out when the UI has an answer for a sixth role.
// permissionsMiddleware.spec.ts pins that the door is shut.
describe('Mutation.createGroupRole', () => {
  const editor = { authorization: { effective: ['group.role.manage', 'group.invite'] } }

  it('refuses a name that is not a key', async () => {
    const { context } = contextFor(editor)

    for (const name of ['Admin', 'with space', 'a', '1leading', 'x'.repeat(33)]) {
      await expect(
        Mutation.createGroupRole({}, { groupId: 'g1', name, permissions: [] }, context),
      ).rejects.toThrow('Invalid role name!')
    }
  })

  it('refuses a system role name', async () => {
    const { context } = contextFor(editor)

    await expect(
      Mutation.createGroupRole({}, { groupId: 'g1', name: 'owner', permissions: [] }, context),
    ).rejects.toThrow('That name belongs to a system role!')
  })

  it('refuses a name the group already uses', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('steward')])
    const { context } = contextFor(editor)

    await expect(
      Mutation.createGroupRole({}, { groupId: 'g1', name: 'steward', permissions: [] }, context),
    ).rejects.toThrow('A role with that name already exists in this group!')
  })

  it('refuses to grant more than the actor holds', async () => {
    const { context } = contextFor(editor)

    await expect(
      Mutation.createGroupRole(
        {},
        { groupId: 'g1', name: 'steward', permissions: ['group.role.manage', 'group.post.pin'] },
        context,
      ),
    ).rejects.toThrow('You cannot grant rights you do not hold yourself')
  })

  it('creates the role with nobody in it yet', async () => {
    const { context, published } = contextFor(editor)

    const created = await Mutation.createGroupRole(
      {},
      { groupId: 'g1', name: 'steward', permissions: ['group.invite'], label: 'Steward' },
      context,
    )

    expect(created).toEqual({
      name: 'steward',
      label: 'Steward',
      system: false,
      protected: false,
      // A new role is a membership too, so the right to end it comes with it.
      permissions: ['group.invite', 'group.leave'],
      memberCount: 0,
    })
    expect(published).toHaveLength(1)
  })

  it('refuses without an authenticated actor', async () => {
    // The shield guarantees one; this is the narrowing, and it fails loudly rather than
    // writing `undefined` as the editor of a role.
    const { context } = contextFor({ ...editor, user: null })

    await expect(
      Mutation.createGroupRole({}, { groupId: 'g1', name: 'steward', permissions: [] }, context),
    ).rejects.toThrow('Missing authenticated user!')
  })
})

describe('Mutation.renameGroupRole', () => {
  it('refuses to rename a system role', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('usual', [], { system: true })])
    const { context } = contextFor()

    await expect(
      Mutation.renameGroupRole({}, { groupId: 'g1', name: 'usual', newName: 'members' }, context),
    ).rejects.toThrow('A system role keeps its name; set its label instead!')
  })

  it('refuses an invalid or reserved new name', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('steward')])
    const { context } = contextFor()

    await expect(
      Mutation.renameGroupRole(
        {},
        { groupId: 'g1', name: 'steward', newName: 'Bad Name' },
        context,
      ),
    ).rejects.toThrow('Invalid role name!')
    await expect(
      Mutation.renameGroupRole({}, { groupId: 'g1', name: 'steward', newName: 'owner' }, context),
    ).rejects.toThrow('Invalid role name!')
  })

  it('refuses a name another role already has', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('steward'), role('curator')])
    const { context } = contextFor()

    await expect(
      Mutation.renameGroupRole({}, { groupId: 'g1', name: 'steward', newName: 'curator' }, context),
    ).rejects.toThrow('A role with that name already exists in this group!')
  })

  it('renames it and keeps its members', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('steward', ['group.invite'])])
    mocked.memberCountsByRole.mockResolvedValue(new Map([['curator', 2]]))
    const { context } = contextFor()

    const renamed = await Mutation.renameGroupRole(
      {},
      { groupId: 'g1', name: 'steward', newName: 'curator' },
      context,
    )

    expect(renamed).toMatchObject({ name: 'curator', permissions: ['group.invite'] })
    expect(mocked.renameGroupRole).toHaveBeenCalledWith(
      context.database,
      'g1',
      'steward',
      'curator',
      'actor',
      expect.any(String),
    )
  })
})

describe('Mutation.deleteGroupRole', () => {
  it('refuses to delete a system role', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('usual', [], { system: true })])
    const { context } = contextFor()

    await expect(
      Mutation.deleteGroupRole({}, { groupId: 'g1', name: 'usual', reassignTo: 'admin' }, context),
    ).rejects.toThrow('A system role cannot be deleted!')
  })

  it('refuses to move the members into the role being deleted', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('steward')])
    const { context } = contextFor()

    await expect(
      Mutation.deleteGroupRole(
        {},
        { groupId: 'g1', name: 'steward', reassignTo: 'steward' },
        context,
      ),
    ).rejects.toThrow('Members must be moved to a different role!')
  })

  it('refuses a destination role that does not exist', async () => {
    // Its members would end up holding a role that is not there, which fails closed to no
    // rights at all — members silently locked out of their own group.
    mocked.readGroupRoles.mockResolvedValue([role('steward')])
    const { context } = contextFor()

    await expect(
      Mutation.deleteGroupRole(
        {},
        { groupId: 'g1', name: 'steward', reassignTo: 'ghost' },
        context,
      ),
    ).rejects.toThrow('Unknown group role!')
  })

  it('deletes it and names what it deleted', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('steward'), role('usual', [], { system: true })])
    const { context, published } = contextFor()

    expect(
      await Mutation.deleteGroupRole(
        {},
        { groupId: 'g1', name: 'steward', reassignTo: 'usual' },
        context,
      ),
    ).toBe('steward')
    expect(mocked.deleteGroupRole).toHaveBeenCalledWith(
      context.database,
      'g1',
      'steward',
      'usual',
      expect.any(String),
    )
    expect(published).toHaveLength(1)
  })
})

describe('Mutation.resetGroupRoles', () => {
  it('refuses for a group that does not exist', async () => {
    const { context } = contextFor({ authorization: null })

    await expect(Mutation.resetGroupRoles({}, { groupId: 'g1' }, context)).rejects.toThrow(
      'Group not found!',
    )
  })

  it('refuses a template nobody seeded', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({ public: [] })
    mocked.readGroupTemplate.mockResolvedValue('public')
    const { context } = contextFor({ authorization: { visibility: 'public' } })

    await expect(Mutation.resetGroupRoles({}, { groupId: 'g1' }, context)).rejects.toThrow(
      'No such role template!',
    )
  })

  it('falls back to the template the group was created from, not to its visibility', async () => {
    // They were the same thing while every template was named after a visibility. Since
    // `channel` they are not: a group running on it is public, and looking the template up by
    // visibility would silently put the `public` one back on.
    const template = [role('none', ['group.read', 'group.content.read']), role('usual')]
    mocked.readGroupRoleTemplates.mockResolvedValue({ channel: template, public: [role('none')] })
    mocked.readGroupTemplate.mockResolvedValue('channel')
    mocked.readGroupRoles.mockResolvedValue(template)
    const { context } = contextFor({ authorization: { visibility: 'public' } })

    await Mutation.resetGroupRoles({}, { groupId: 'g1' }, context)

    expect(mocked.replaceGroupRoles).toHaveBeenCalledWith(
      context.database,
      'g1',
      template,
      'usual',
      'actor',
      expect.any(String),
    )
  })

  it('records which template the group runs on now', async () => {
    // What the admin area counts when it says how many groups an edit would reach. A group
    // given the channel template and still recorded as `public` would be counted under the
    // wrong one and rewritten by an edit meant for somebody else.
    const template = [role('none', ['group.read', 'group.content.read']), role('usual')]
    mocked.readGroupRoleTemplates.mockResolvedValue({ channel: template })
    mocked.readGroupTemplate.mockResolvedValue('public')
    mocked.readGroupRoles.mockResolvedValue(template)
    const { context } = contextFor({ authorization: { visibility: 'public' } })

    await Mutation.resetGroupRoles({}, { groupId: 'g1', template: 'channel' }, context)

    expect(mocked.writeGroupTemplate).toHaveBeenCalledWith(context.database, 'g1', 'channel')
  })

  describe('the coverage rule', () => {
    // A template may not hand out a right the actor does not hold — or somebody given
    // `group.role.manage` in a trimmed role could restore their own role to the template's set.
    // Public, like the group, so the privacy cap has nothing to say and coverage is what decides.
    const nonMember = role('none', ['group.read', 'group.content.read'])
    const template = [nonMember, role('usual', ['group.invite'])]

    it('refuses a template that would give a role a right the actor lacks', async () => {
      mocked.readGroupRoleTemplates.mockResolvedValue({ public: template })
      mocked.readGroupTemplate.mockResolvedValue('public')
      mocked.readGroupRoles.mockResolvedValue([nonMember, role('usual')])
      const { context } = contextFor({
        authorization: {
          visibility: 'public',
          roleName: 'admin',
          effective: ['group.read', 'group.content.read'],
        },
      })

      await expect(Mutation.resetGroupRoles({}, { groupId: 'g1' }, context)).rejects.toThrow(
        'You cannot grant rights you do not hold yourself: group.invite',
      )
      expect(mocked.replaceGroupRoles).not.toHaveBeenCalled()
    })

    it('does not ask for a right a role already has', async () => {
      // Keeping a right grants nobody anything — the same reading updateGroupRole takes.
      mocked.readGroupRoleTemplates.mockResolvedValue({ public: template })
      mocked.readGroupTemplate.mockResolvedValue('public')
      mocked.readGroupRoles.mockResolvedValue(template)
      const { context } = contextFor({
        authorization: { visibility: 'public', roleName: 'admin', effective: [] },
      })

      await Mutation.resetGroupRoles({}, { groupId: 'g1' }, context)

      expect(mocked.replaceGroupRoles).toHaveBeenCalled()
    })

    it('does not ask the owner, who holds the whole catalog by definition', async () => {
      // Their effective set lacks what is switched off network-wide; asking would stop an owner
      // from applying any template on a network without, say, LiveKit.
      mocked.readGroupRoleTemplates.mockResolvedValue({ public: template })
      mocked.readGroupTemplate.mockResolvedValue('public')
      mocked.readGroupRoles.mockResolvedValue([])
      const { context } = contextFor({
        authorization: { visibility: 'public', roleName: 'owner', effective: [] },
      })

      await Mutation.resetGroupRoles({}, { groupId: 'g1' }, context)

      expect(mocked.replaceGroupRoles).toHaveBeenCalled()
    })
  })

  it('refuses a template that would make the group more private than one may create', async () => {
    // Applying a template rewrites the non-member role, which IS the visibility — so the same
    // cap guards it as guards editing that role by hand (E10). Without it, "apply the secret
    // template" would be the way around `group.create_hidden`.
    mocked.readGroupRoleTemplates.mockResolvedValue({ hidden: [role('none')] })
    mocked.readGroupTemplate.mockResolvedValue('public')
    const { context } = contextFor({ authorization: { visibility: 'public' } })

    await expect(
      Mutation.resetGroupRoles({}, { groupId: 'g1', template: 'hidden' }, context),
    ).rejects.toThrow('more private')
  })

  it('replaces the roles with the template and keeps the members as ordinary ones', async () => {
    const template = [role('none', ['group.read']), role('usual')]
    mocked.readGroupRoleTemplates.mockResolvedValue({ closed: template })
    mocked.readGroupTemplate.mockResolvedValue('closed')
    mocked.readGroupRoles.mockResolvedValue(template)
    const { context, published } = contextFor({ authorization: { visibility: 'closed' } })

    await Mutation.resetGroupRoles({}, { groupId: 'g1' }, context)

    expect(mocked.replaceGroupRoles).toHaveBeenCalledWith(
      context.database,
      'g1',
      template,
      'usual',
      'actor',
      expect.any(String),
    )
    // A reset is not a customisation: the group goes back to running on the template.
    expect(mocked.markGroupRolesCustomized).not.toHaveBeenCalled()
    expect(published).toHaveLength(1)
  })
})

describe('Mutation.setGroupMemberRole', () => {
  it('refuses a role the group does not have', async () => {
    const { context } = contextFor()

    await expect(
      Mutation.setGroupMemberRole({}, { groupId: 'g1', userId: 'u1', roleName: 'ghost' }, context),
    ).rejects.toThrow('Unknown group role!')
  })

  it('refuses when neither the user nor the group is there', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('usual')])
    const { context } = contextFor({ writeRecords: [] })

    await expect(
      Mutation.setGroupMemberRole({}, { groupId: 'g1', userId: 'u1', roleName: 'usual' }, context),
    ).rejects.toThrow('Could not find user or group!')
  })

  it('writes the membership and announces the change', async () => {
    mocked.readGroupRoles.mockResolvedValue([role('usual')])
    const { context, published, queries } = contextFor({
      writeRecords: [record({ user: { id: 'u1' }, membership: { role: 'usual' } })],
    })

    expect(
      await Mutation.setGroupMemberRole(
        {},
        { groupId: 'g1', userId: 'u1', roleName: 'usual' },
        context,
      ),
    ).toEqual({ user: { id: 'u1' }, membership: { role: 'usual' } })
    expect(queries[0].variables).toMatchObject({ groupId: 'g1', userId: 'u1', roleName: 'usual' })
    expect(published).toHaveLength(1)
  })
})

describe('Mutation.removePostFromGroup', () => {
  it('refuses a post that is not in that group', async () => {
    const { context } = contextFor({ writeRecords: [] })

    await expect(
      Mutation.removePostFromGroup({}, { groupId: 'g1', postId: 'p1' }, context),
    ).rejects.toThrow('That post is not in this group!')
  })

  it('takes the post out and notifies its author in the same statement', async () => {
    // A removal must never happen silently, which is why the notification is not a second
    // write that could be skipped.
    const { context, queries } = contextFor({ writeRecords: [record({ post: { id: 'p1' } })] })

    expect(
      await Mutation.removePostFromGroup({}, { groupId: 'g1', postId: 'p1' }, context),
    ).toEqual({ id: 'p1' })
    expect(queries[0].query).toContain('DELETE edge')
    expect(queries[0].query).toContain("NOTIFIED {reason: 'post_removed_from_group'}")
  })
})

describe('Mutation.updateGroupRoleTemplate', () => {
  it('refuses a template role that does not exist', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({ public: [role('none')] })
    const { context } = contextFor()

    await expect(
      Mutation.updateGroupRoleTemplate(
        {},
        { template: 'public', name: 'ghost', permissions: [] },
        context,
      ),
    ).rejects.toThrow('Unknown group role template!')
  })

  it('refuses a permission list on the owner template', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({
      public: [role('owner', [], { protected: true })],
    })
    const { context } = contextFor()

    await expect(
      Mutation.updateGroupRoleTemplate(
        {},
        { template: 'public', name: 'owner', permissions: ['group.read'] },
        context,
      ),
    ).rejects.toThrow('The owner role holds every right and cannot be edited!')
  })

  it('keeps the owner template`s list empty while relabelling it', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({
      public: [role('owner', [], { protected: true })],
    })
    const { context } = contextFor()

    const updated = await Mutation.updateGroupRoleTemplate(
      {},
      { template: 'public', name: 'owner', permissions: [], label: 'Founder' },
      context,
    )

    expect(updated).toMatchObject({ permissions: [], label: 'Founder' })
  })

  it('refuses a non-member role that contradicts the template`s own name', async () => {
    // The name of a template IS a privacy level, and the level comes from these two rights. A
    // `public` template whose non-member role cannot read would create groups listed as
    // public that nobody can find — the operator who wants that has the `closed` template.
    mocked.readGroupRoleTemplates.mockResolvedValue({ public: [role('none', ['group.read'])] })
    const { context } = contextFor()

    await expect(
      Mutation.updateGroupRoleTemplate(
        {},
        { template: 'public', name: 'none', permissions: ['group.read'] },
        context,
      ),
    ).rejects.toThrow('a different visibility than it is named')
  })

  it('accepts a non-member role that matches the name', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({ closed: [role('none', ['group.read'])] })
    const { context } = contextFor()

    await expect(
      Mutation.updateGroupRoleTemplate(
        {},
        { template: 'closed', name: 'none', permissions: ['group.read', 'group.join.request'] },
        context,
      ),
    ).resolves.toMatchObject({ name: 'none' })
  })

  it('writes the template and leaves existing groups alone', async () => {
    // Concept E12: a template change is a default for NEW groups, so nobody's effective
    // rights just changed and there is nothing to announce.
    mocked.readGroupRoleTemplates.mockResolvedValue({ public: [role('admin')] })
    const { context, published } = contextFor()

    const updated = await Mutation.updateGroupRoleTemplate(
      {},
      { template: 'public', name: 'admin', permissions: ['group.invite', 'group.teleport'] },
      context,
    )

    expect(updated).toMatchObject({
      permissions: ['group.invite', 'group.leave'],
      memberCount: null,
    })
    expect(mocked.writeGroupRoleTemplate).toHaveBeenCalled()
    expect(published).toEqual([])
  })
})

describe('Mutation.applyGroupRoleTemplates', () => {
  it('applies each type`s template to the groups that never touched their roles', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({
      public: [role('none')],
      closed: [role('none')],
    })
    mocked.untouchedGroupIdsByTemplate.mockResolvedValue(
      new Map([
        ['public', groupsOfTemplate(['a', 'b'])],
        ['closed', groupsOfTemplate(['c'])],
      ]),
    )
    const { context, published } = contextFor()

    expect(await Mutation.applyGroupRoleTemplates({}, {}, context)).toBe(3)
    expect(mocked.replaceGroupRoles).toHaveBeenCalledTimes(3)
    // Each of those groups has to refetch, because its rights may well have changed.
    expect(published).toHaveLength(3)
  })

  it('skips a visibility whose template is missing or empty', async () => {
    mocked.readGroupRoleTemplates.mockResolvedValue({ public: [] })
    mocked.untouchedGroupIdsByTemplate.mockResolvedValue(
      new Map([
        ['public', groupsOfTemplate(['a'])],
        ['hidden', groupsOfTemplate(['b'])],
      ]),
    )
    const { context } = contextFor()

    expect(await Mutation.applyGroupRoleTemplates({}, {}, context)).toBe(0)
    expect(mocked.replaceGroupRoles).not.toHaveBeenCalled()
  })

  it('leaves a group that customised its roles untouched', async () => {
    // The whole point of rolesCustomizedAt: a bulk update never overwrites a group's own
    // decision.
    mocked.readGroupRoleTemplates.mockResolvedValue({ public: [role('none')] })
    mocked.untouchedGroupIdsByTemplate.mockResolvedValue(new Map())
    const { context } = contextFor()

    expect(await Mutation.applyGroupRoleTemplates({}, {}, context)).toBe(0)
  })
})

describe('Subscription.groupPermissionsChanged', () => {
  // Subscriptions bypass the request pipeline, so this filter is the only thing deciding who
  // hears that a group's rights changed. A real PubSub rather than a stub: the filter only
  // runs when something is actually published through it.
  const subscription = resolvers.Subscription.groupPermissionsChanged

  // A filtered-out event never resolves `next()`, so the negative assertion has to be bounded.
  const DROPPED = Symbol('dropped')
  const bounded = async (next: Promise<IteratorResult<unknown>>) =>
    Promise.race([next, delay(200, DROPPED, { ref: false })])

  it('delivers the change to a subscriber of that group', async () => {
    const pubsub = new PubSub()
    const iterator = subscription.subscribe(null, { groupId: 'g1' }, { pubsub }, null)
    const next = iterator.next() as Promise<IteratorResult<unknown>>

    await pubsub.publish(GROUP_PERMISSIONS_CHANGED, { groupPermissionsChanged: { groupId: 'g1' } })

    expect(await bounded(next)).toMatchObject({
      value: { groupPermissionsChanged: { groupId: 'g1' } },
    })
  })

  it('drops a change to a different group', async () => {
    const pubsub = new PubSub()
    const iterator = subscription.subscribe(null, { groupId: 'g1' }, { pubsub }, null)
    const next = iterator.next() as Promise<IteratorResult<unknown>>

    await pubsub.publish(GROUP_PERMISSIONS_CHANGED, {
      groupPermissionsChanged: { groupId: 'other' },
    })

    expect(await bounded(next)).toBe(DROPPED)
  })
})

// The break-glass path (concept E18). Reading into a group a network right reaches is immediate;
// ACTING there waits for the viewer to say so, and that ask is a record at the group with an
// hour on it. These are this file's own decisions about it — the Cypher is repository.spec.ts.
describe('Group.myGroupElevation', () => {
  it('says nothing while the viewer has not asked', async () => {
    // Not even a read: `elevated` is already in the authorization every request resolves once,
    // so a page full of group teasers must not turn into a query per teaser.
    const { context } = contextFor({ authorization: { elevated: false } })

    await expect(Group.myGroupElevation({ id: 'g1' }, {}, context)).resolves.toBeNull()
    expect(mocked.readElevation).not.toHaveBeenCalled()
  })

  it('reads the record out once there is one, so the page can show until when', async () => {
    const elevation = {
      groupId: 'g1',
      expiresAt: '2026-10-02T17:00:00.000Z',
      reason: 'Reviewing a report',
    }
    mocked.readElevation.mockResolvedValue(elevation)
    const { context } = contextFor({ authorization: { elevated: true } })

    await expect(Group.myGroupElevation({ id: 'g1' }, {}, context)).resolves.toEqual(elevation)
    expect(mocked.readElevation).toHaveBeenCalledWith(context.database, 'g1', 'actor')
  })
})

describe('Group.mayElevateInGroup', () => {
  it('offers the ask only where it would add something', async () => {
    const { context } = contextFor({ authorization: { mayElevate: true } })

    await expect(Group.mayElevateInGroup({ id: 'g1' }, {}, context)).resolves.toBe(true)
  })

  it('does not offer it to somebody who already holds everything here', async () => {
    const { context } = contextFor({ authorization: { mayElevate: false } })

    await expect(Group.mayElevateInGroup({ id: 'g1' }, {}, context)).resolves.toBe(false)
  })

  it('answers no, not null, for a group the viewer cannot resolve at all', async () => {
    // The field is non-null in the schema; a null here would fail the whole group query rather
    // than answer "no".
    const { context } = contextFor({ authorization: null })

    await expect(Group.mayElevateInGroup({ id: 'g1' }, {}, context)).resolves.toBe(false)
  })
})

describe('Mutation.elevateInGroup', () => {
  it('writes the record with the reason, announces it, and logs who did it where', async () => {
    const elevation = { groupId: 'g1', expiresAt: '2026-10-02T17:00:00.000Z', reason: 'Report #12' }
    mocked.writeElevation.mockResolvedValue(elevation)
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { context, published } = contextFor({ authorization: { mayElevate: true } })

    await expect(
      Mutation.elevateInGroup({}, { groupId: 'g1', reason: 'Report #12' }, context),
    ).resolves.toEqual(elevation)

    expect(mocked.writeElevation).toHaveBeenCalledWith(
      context.database,
      'g1',
      'actor',
      'Report #12',
    )
    // The record IS the log entry: who, where, until when. Without the line the only trace
    // would be a relationship that deletes itself an hour later.
    expect(log).toHaveBeenCalledWith(expect.stringContaining('actor'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('g1'))
    // Everything the viewer may do here just changed, so the pages holding this group re-ask.
    expect(published).toEqual([
      { event: GROUP_PERMISSIONS_CHANGED, payload: { groupPermissionsChanged: { groupId: 'g1' } } },
    ])

    log.mockRestore()
  })

  it('refuses for a group that is not there', async () => {
    const { context } = contextFor({ authorization: null })

    await expect(Mutation.elevateInGroup({}, { groupId: 'ghost' }, context)).rejects.toThrow(
      UserInputError,
    )
    expect(mocked.writeElevation).not.toHaveBeenCalled()
  })

  it('refuses when there is nothing to pick up', async () => {
    // A member, or an owner: their rights come from the membership, and an elevation that adds
    // nothing would still be a record saying they acted as the network.
    const { context } = contextFor({ authorization: { mayElevate: false } })

    await expect(Mutation.elevateInGroup({}, { groupId: 'g1' }, context)).rejects.toThrow(
      'You hold nothing here beyond reading!',
    )
    expect(mocked.writeElevation).not.toHaveBeenCalled()
  })

  it('refuses a reason that is not one', async () => {
    // The reason is shown to whoever reads the group's record later, so it goes through the
    // same validation as a role label rather than straight into the graph.
    const { context } = contextFor({ authorization: { mayElevate: true } })

    await expect(
      Mutation.elevateInGroup({}, { groupId: 'g1', reason: ' padded ' }, context),
    ).rejects.toThrow('Invalid role label!')
    expect(mocked.writeElevation).not.toHaveBeenCalled()
  })
})

describe('Mutation.endGroupElevation', () => {
  it('puts the rights down and announces that it happened', async () => {
    mocked.clearElevation.mockResolvedValue(true)
    const { context, published } = contextFor()

    await expect(Mutation.endGroupElevation({}, { groupId: 'g1' }, context)).resolves.toBe(true)

    expect(mocked.clearElevation).toHaveBeenCalledWith(context.database, 'g1', 'actor')
    expect(published).toHaveLength(1)
  })

  it('stays quiet when there was nothing to put down', async () => {
    // Announcing anyway would make every page holding this group refetch for nothing.
    mocked.clearElevation.mockResolvedValue(false)
    const { context, published } = contextFor()

    await expect(Mutation.endGroupElevation({}, { groupId: 'g1' }, context)).resolves.toBe(false)
    expect(published).toEqual([])
  })
})
