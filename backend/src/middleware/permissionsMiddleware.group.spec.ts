import { describe, expect, it, vi } from 'vitest'

import { groupAuthorizationRules } from './permissionsMiddleware'

import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'

// The group-scoped shield rules, driven directly.
//
// Several of their arms cannot be reached through a GraphQL request: a group id that resolves
// to nothing, an argument the schema types as non-null, a parent object the server builds
// itself. Those are exactly the arms worth asserting — a guard nobody can reach is a claim
// nobody can check — and a fake context is what makes each of them one line.
const {
  byArg,
  byPost,
  byRoom,
  hasGroupPermission,
  parentHasGroupPermission,
  canChangeGroupType,
  canJoinGroup,
  isLeavingSelf,
  canAssignGroupRole,
  canRemoveGroupMember,
  canAdministerSomeGroup,
  canReviewReportedContent,
} = groupAuthorizationRules

interface AuthorizationStub {
  groupType?: string
  effective?: string[]
}

const authorizationOf = (stub: AuthorizationStub) => ({
  groupId: 'g1',
  groupType: stub.groupType ?? 'public',
  roleName: 'usual',
  isMember: true,
  hasRoleDefinition: true,
  effective: new Set(stub.effective ?? []),
  has: (permission: string) => new Set(stub.effective ?? []).has(permission),
  sourceOf: () => null,
})

const contextFor = (
  options: {
    user?: { id: string } | null
    network?: string[]
    group?: AuthorizationStub | null
    post?: AuthorizationStub | null
    room?: AuthorizationStub | null
    memberRole?: string
    memberPermissions?: string[]
    rolePermissions?: string[] | null
    queryRecords?: Array<{ get: (key: string) => unknown }>
  } = {},
) =>
  ({
    user: options.user === undefined ? { id: 'actor' } : options.user,
    effectivePermissions: new Set((options.network ?? []) as PermissionKey[]),
    // The network rights below are gated by `groupsEnabled`, so a context without a policy
    // would answer "unavailable" and the gate rather than the rule would be under test.
    policy: { getEffective: () => true, get: () => true },
    // graphql-shield keeps its per-request rule cache on the context, and a rule declared with
    // `cache: 'contextual'` reads it directly — the middleware would normally have put it there.
    _shield: { cache: {} },
    database: {
      query: vi.fn(async () => Promise.resolve({ records: options.queryRecords ?? [] })),
    },
    groupAuthorization: {
      forGroup: vi.fn(async () =>
        Promise.resolve(options.group == null ? null : authorizationOf(options.group)),
      ),
      forPost: vi.fn(async () =>
        Promise.resolve(options.post == null ? null : authorizationOf(options.post)),
      ),
      forRoom: vi.fn(async () =>
        Promise.resolve(options.room == null ? null : authorizationOf(options.room)),
      ),
      forGroupMemberRole: vi.fn(async () => Promise.resolve(options.memberRole ?? 'none')),
      memberPermissions: vi.fn(async () =>
        Promise.resolve(new Set(options.memberPermissions ?? [])),
      ),
      rolePermissions: vi.fn(async () =>
        Promise.resolve(
          options.rolePermissions === null ? null : new Set(options.rolePermissions ?? []),
        ),
      ),
    },
  }) as unknown as Context

// graphql-shield rules answer through resolve(parent, args, context, info).
const resolve = async (rule: unknown, parent: unknown, args: unknown, context: Context) =>
  (
    rule as {
      resolve: (
        p: unknown,
        a: unknown,
        c: Context,
        i: unknown,
        o: { debug: boolean },
      ) => Promise<boolean>
    }
  )
    // `debug: true` so a rule that throws fails the test instead of reading as "denied" —
    // which is what the library does with an error in production, and the last thing a test
    // should do.
    .resolve(parent, args, context, { fieldNodes: [] }, { debug: true })

describe('the locators', () => {
  it('report "no group" when the argument is absent or empty', async () => {
    // A post outside any group, a direct-message room: the operation has no group context, so
    // the network permission alone decides.
    const context = contextFor()

    expect(await byArg('groupId')({}, context)).toEqual({ type: 'noGroup' })
    expect(await byArg('groupId')({ groupId: '' }, context)).toEqual({ type: 'noGroup' })
    expect(await byPost('postId')({}, context)).toEqual({ type: 'noGroup' })
    expect(await byRoom('roomId')({}, context)).toEqual({ type: 'noGroup' })
  })

  it('report "not found" when an id was given but nothing came back', async () => {
    // Deny rather than fall through: the operation named a group and the group is not there,
    // so it cannot be authorized.
    const context = contextFor({ group: null })

    expect(await byArg('groupId')({ groupId: 'g1' }, context)).toEqual({ type: 'notFound' })
  })

  it('report "no group" for a post or room that belongs to none', async () => {
    const context = contextFor({ post: null, room: null })

    expect(await byPost('postId')({ postId: 'p1' }, context)).toEqual({ type: 'noGroup' })
    expect(await byRoom('roomId')({ roomId: 'r1' }, context)).toEqual({ type: 'noGroup' })
  })

  it('carry the authorization of the group they found', async () => {
    const context = contextFor({
      group: { effective: ['group.read'] },
      post: { effective: ['group.content.read'] },
      room: { effective: ['group.chat.participate'] },
    })

    expect((await byArg('groupId')({ groupId: 'g1' }, context)).type).toBe('group')
    expect((await byPost('postId')({ postId: 'p1' }, context)).type).toBe('group')
    expect((await byRoom('roomId')({ roomId: 'r1' }, context)).type).toBe('group')
  })
})

describe(hasGroupPermission, () => {
  it('denies when the named group does not exist', async () => {
    const rule = hasGroupPermission('group.read')

    expect(await resolve(rule, {}, { groupId: 'g1' }, contextFor({ group: null }))).toBe(false)
  })

  it('allows when no group is named, leaving the network permission to decide', async () => {
    const rule = hasGroupPermission('group.post.create')

    expect(await resolve(rule, {}, {}, contextFor())).toBe(true)
  })

  it('takes the locator it is given, not only the default one', async () => {
    // The shield map names the locator per entry — `byPost` for a comment, `byRoom` for a chat
    // message — so the default is only one of the two ways this is called.
    const rule = hasGroupPermission('group.chat.participate', byRoom('roomId'))
    const context = contextFor({ room: { effective: ['group.chat.participate'] } })

    expect(await resolve(rule, {}, { roomId: 'r1' }, context)).toBe(true)
  })

  it('asks the group for the right when one was found', async () => {
    const rule = hasGroupPermission('group.post.create')
    const holding = contextFor({ group: { effective: ['group.post.create'] } })
    const withholding = contextFor({ group: { effective: [] } })

    expect(await resolve(rule, {}, { groupId: 'g1' }, holding)).toBe(true)
    expect(await resolve(rule, {}, { groupId: 'g1' }, withholding)).toBe(false)
  })
})

describe(parentHasGroupPermission, () => {
  it('denies for a parent that carries no id', async () => {
    const rule = parentHasGroupPermission('group.role.manage')

    expect(await resolve(rule, {}, {}, contextFor())).toBe(false)
    expect(await resolve(rule, null, {}, contextFor())).toBe(false)
  })

  it('denies when the parent`s group cannot be resolved', async () => {
    const rule = parentHasGroupPermission('group.role.manage')

    expect(await resolve(rule, { id: 'g1' }, {}, contextFor({ group: null }))).toBe(false)
  })

  it('asks the group for the right', async () => {
    const rule = parentHasGroupPermission('group.role.manage')
    const context = contextFor({ group: { effective: ['group.role.manage'] } })

    expect(await resolve(rule, { id: 'g1' }, {}, context)).toBe(true)
  })
})

describe('canChangeGroupType', () => {
  it('allows a request that does not touch the type', async () => {
    const context = contextFor({ group: { groupType: 'public' } })

    expect(await resolve(canChangeGroupType, {}, { id: 'g1' }, context)).toBe(true)
    expect(await resolve(canChangeGroupType, {}, { id: 'g1', groupType: null }, context)).toBe(true)
  })

  it('denies for a group that does not exist', async () => {
    const context = contextFor({ group: null })

    expect(await resolve(canChangeGroupType, {}, { id: 'g1', groupType: 'hidden' }, context)).toBe(
      false,
    )
  })

  it('allows sending the type the group already has', async () => {
    // The group form posts every field it knows, so demanding the right for an unchanged value
    // would stop an owner who may not create hidden groups from editing the hidden group they
    // already own.
    const context = contextFor({ group: { groupType: 'hidden', effective: [] } })

    expect(await resolve(canChangeGroupType, {}, { id: 'g1', groupType: 'hidden' }, context)).toBe(
      true,
    )
  })

  it('needs the right for an actual change', async () => {
    const withRight = contextFor({
      group: { groupType: 'public', effective: ['group.type.change'] },
    })
    const without = contextFor({ group: { groupType: 'public', effective: [] } })

    expect(
      await resolve(canChangeGroupType, {}, { id: 'g1', groupType: 'closed' }, withRight),
    ).toBe(true)
    expect(await resolve(canChangeGroupType, {}, { id: 'g1', groupType: 'closed' }, without)).toBe(
      false,
    )
  })
})

describe('canJoinGroup', () => {
  it('denies an anonymous request', async () => {
    const context = contextFor({ user: null, group: { effective: ['group.join'] } })

    expect(await resolve(canJoinGroup, {}, { groupId: 'g1', userId: 'actor' }, context)).toBe(false)
  })

  it('denies for a group that does not exist', async () => {
    expect(
      await resolve(
        canJoinGroup,
        {},
        { groupId: 'g1', userId: 'actor' },
        contextFor({ group: null }),
      ),
    ).toBe(false)
  })

  it('lets somebody in who may enter, and queues somebody who may ask', async () => {
    const direct = contextFor({ group: { effective: ['group.join'] } })
    const onRequest = contextFor({ group: { effective: ['group.join.request'] } })
    const neither = contextFor({ group: { effective: [] } })

    expect(await resolve(canJoinGroup, {}, { groupId: 'g1', userId: 'actor' }, direct)).toBe(true)
    expect(await resolve(canJoinGroup, {}, { groupId: 'g1', userId: 'actor' }, onRequest)).toBe(
      true,
    )
    expect(await resolve(canJoinGroup, {}, { groupId: 'g1', userId: 'actor' }, neither)).toBe(false)
  })

  it('treats adding somebody ELSE as membership management', async () => {
    // Before this rule, any authenticated user could add any other user to a public group.
    const approver = contextFor({ group: { effective: ['group.member.approve'] } })
    const joiner = contextFor({ group: { effective: ['group.join'] } })

    expect(await resolve(canJoinGroup, {}, { groupId: 'g1', userId: 'other' }, approver)).toBe(true)
    expect(await resolve(canJoinGroup, {}, { groupId: 'g1', userId: 'other' }, joiner)).toBe(false)
  })
})

describe('isLeavingSelf', () => {
  it('is only about one`s own membership', async () => {
    const context = contextFor()

    expect(await resolve(isLeavingSelf, {}, { userId: 'actor' }, context)).toBe(true)
    expect(await resolve(isLeavingSelf, {}, { userId: 'other' }, context)).toBe(false)
    expect(await resolve(isLeavingSelf, {}, { userId: 'actor' }, contextFor({ user: null }))).toBe(
      false,
    )
  })
})

describe('canAssignGroupRole', () => {
  const args = { groupId: 'g1', userId: 'other', roleName: 'admin' }

  it('denies an anonymous request', async () => {
    expect(await resolve(canAssignGroupRole, {}, args, contextFor({ user: null }))).toBe(false)
  })

  it('denies when no role name was given at all', async () => {
    // Unreachable through the schema (both arguments are non-null), which is why it is asserted
    // here: the rule must not read `undefined` as "some role".
    expect(
      await resolve(canAssignGroupRole, {}, { groupId: 'g1', userId: 'other' }, contextFor()),
    ).toBe(false)
  })

  it('accepts either argument name while the deprecated mutation is around', async () => {
    const context = contextFor({
      group: { effective: ['group.member.role.assign'] },
      rolePermissions: [],
      memberRole: 'admin',
    })

    expect(
      await resolve(
        canAssignGroupRole,
        {},
        { groupId: 'g1', userId: 'other', roleInGroup: 'admin' },
        context,
      ),
    ).toBe(true)
  })

  it('denies without the right', async () => {
    const context = contextFor({ group: { effective: [] }, rolePermissions: [] })

    expect(await resolve(canAssignGroupRole, {}, args, context)).toBe(false)
  })

  it('denies a role the group does not have', async () => {
    const context = contextFor({
      group: { effective: ['group.member.role.assign'] },
      rolePermissions: null,
    })

    expect(await resolve(canAssignGroupRole, {}, args, context)).toBe(false)
  })

  it('lets somebody change their OWN role as far as they cover it', async () => {
    // Demoting yourself is not an act of power over anybody — it is what an owner does when
    // handing a group over, and an owner-less group is legal.
    const covering = contextFor({
      group: { effective: ['group.member.role.assign', 'group.invite'] },
      rolePermissions: ['group.invite'],
    })
    const notCovering = contextFor({
      group: { effective: ['group.member.role.assign'] },
      rolePermissions: ['group.type.change'],
    })

    expect(await resolve(canAssignGroupRole, {}, { ...args, userId: 'actor' }, covering)).toBe(true)
    expect(await resolve(canAssignGroupRole, {}, { ...args, userId: 'actor' }, notCovering)).toBe(
      false,
    )
  })

  it('allows assigning the role somebody already holds', async () => {
    // The group UI sends it (a role picker set to its current value), and it changes nothing,
    // so it needs no authority over that person.
    const context = contextFor({
      group: { effective: ['group.member.role.assign'] },
      rolePermissions: ['group.type.change'],
      memberRole: 'admin',
    })

    expect(await resolve(canAssignGroupRole, {}, args, context)).toBe(true)
  })

  it('needs dominance and coverage to change somebody else', async () => {
    const context = contextFor({
      group: { effective: ['group.member.role.assign', 'group.invite', 'group.post.pin'] },
      rolePermissions: ['group.invite'],
      memberRole: 'usual',
      memberPermissions: [],
    })

    expect(await resolve(canAssignGroupRole, {}, args, context)).toBe(true)
  })
})

describe('canRemoveGroupMember', () => {
  it('denies removing oneself, which is what leaving is for', async () => {
    const context = contextFor({ group: { effective: ['group.member.remove'] } })

    expect(
      await resolve(canRemoveGroupMember, {}, { groupId: 'g1', userId: 'actor' }, context),
    ).toBe(false)
  })

  it('denies an anonymous request', async () => {
    const context = contextFor({ user: null, group: { effective: ['group.member.remove'] } })

    expect(
      await resolve(canRemoveGroupMember, {}, { groupId: 'g1', userId: 'other' }, context),
    ).toBe(false)
  })

  it('denies for a group that does not exist', async () => {
    expect(
      await resolve(
        canRemoveGroupMember,
        {},
        { groupId: 'g1', userId: 'other' },
        contextFor({ group: null }),
      ),
    ).toBe(false)
  })

  it('needs the right and dominance over the member', async () => {
    const dominating = contextFor({
      group: { effective: ['group.member.remove', 'group.post.pin'] },
      memberPermissions: [],
    })
    const equal = contextFor({
      group: { effective: ['group.member.remove'] },
      memberPermissions: ['group.member.remove'],
    })

    expect(
      await resolve(canRemoveGroupMember, {}, { groupId: 'g1', userId: 'other' }, dominating),
    ).toBe(true)
    expect(await resolve(canRemoveGroupMember, {}, { groupId: 'g1', userId: 'other' }, equal)).toBe(
      false,
    )
  })
})

describe('canAdministerSomeGroup', () => {
  it('opens the admin group list for any one of the per-type rights', async () => {
    expect(await resolve(canAdministerSomeGroup, {}, {}, contextFor())).toBe(false)
    expect(
      await resolve(
        canAdministerSomeGroup,
        {},
        {},
        contextFor({ network: ['group.administer.any_hidden'] }),
      ),
    ).toBe(true)
  })
})

describe('canReviewReportedContent', () => {
  const row = (values: Record<string, unknown>) => ({
    get: (key: string) => values[key], // eslint-disable-line security/detect-object-injection -- test fixture, literal keys
  })

  it('denies a review without a resource', async () => {
    expect(await resolve(canReviewReportedContent, {}, {}, contextFor())).toBe(false)
  })

  it('allows a review of content that is in no group', async () => {
    const context = contextFor({ queryRecords: [row({ groupType: null, readableHere: false })] })

    expect(await resolve(canReviewReportedContent, {}, { resourceId: 'p1' }, context)).toBe(true)
  })

  it('allows it when the group itself says the content is readable', async () => {
    // Either it opened its content to non-members, or this moderator`s role in it grants
    // reading — the query answers both as `readableHere`.
    const context = contextFor({ queryRecords: [row({ groupType: 'closed', readableHere: true })] })

    expect(await resolve(canReviewReportedContent, {}, { resourceId: 'p1' }, context)).toBe(true)
  })

  it('falls back to the per-type network right', async () => {
    const records = [row({ groupType: 'closed', readableHere: false })]
    const moderator = contextFor({
      queryRecords: records,
      network: ['group.content.read.any_closed'],
    })
    const other = contextFor({ queryRecords: records, network: ['group.content.read.any_hidden'] })

    expect(await resolve(canReviewReportedContent, {}, { resourceId: 'p1' }, moderator)).toBe(true)
    expect(await resolve(canReviewReportedContent, {}, { resourceId: 'p1' }, other)).toBe(false)
  })

  it('allows a review when the resource is not there at all', async () => {
    // Nothing to protect: the row is gone, and the report can be closed.
    const context = contextFor({ queryRecords: [] })

    expect(await resolve(canReviewReportedContent, {}, { resourceId: 'p1' }, context)).toBe(true)
  })
})
