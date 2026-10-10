import { describe, expect, it, vi } from 'vitest'

import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'

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
  byGroupPost,
  byRoom,
  hasGroupPermission,
  parentHasGroupPermission,
  canChangeVisibility,
  canChangeMemberListAccess,
  canJoinGroup,
  isLeavingSelf,
  canAssignGroupRole,
  canRemoveGroupMember,
  canAdministerSomeGroup,
  canReviewReportedContent,
} = groupAuthorizationRules

interface AuthorizationStub {
  visibility?: string
  isMember?: boolean
  effective?: string[]
  outranksMembers?: boolean
}

const authorizationOf = (stub: AuthorizationStub) => ({
  groupId: 'g1',
  visibility: stub.visibility ?? 'public',
  roleName: stub.isMember === false ? 'none' : 'usual',
  isMember: stub.isMember ?? true,
  hasRoleDefinition: true,
  effective: new Set(stub.effective ?? []),
  has: (permission: string) => new Set(stub.effective ?? []).has(permission),
  sourceOf: () => null,
  outranksMembers: stub.outranksMembers ?? false,
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
    groupsEnabled?: boolean
  } = {},
) =>
  ({
    user: options.user === undefined ? { id: 'actor' } : options.user,
    effectivePermissions: new Set((options.network ?? []) as PermissionKey[]),
    // The network rights below are gated by `groupsEnabled`, so a context without a policy
    // would answer "unavailable" and the gate rather than the rule would be under test.
    policy: {
      getEffective: (key: string) => key !== 'groupsEnabled' || options.groupsEnabled !== false,
      get: () => true,
    },
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
      room: { effective: ['group.chat.write'] },
    })

    expect((await byArg('groupId')({ groupId: 'g1' }, context)).type).toBe('group')
    expect((await byPost('postId')({ postId: 'p1' }, context)).type).toBe('group')
    expect((await byRoom('roomId')({ roomId: 'r1' }, context)).type).toBe('group')
  })

  it('report "not found" for an operation that only exists for a GROUP post', async () => {
    // Unpinning from a group: a post that is not there, or not in a group, is nothing it can
    // be authorized on — where byPost would let the network decide, as it does for a comment.
    const context = contextFor({ post: null })

    expect(await byGroupPost('id')({ id: 'p1' }, context)).toEqual({ type: 'notFound' })
    expect(await byGroupPost('id')({}, context)).toEqual({ type: 'notFound' })
    expect(
      (await byGroupPost('id')({ id: 'p1' }, contextFor({ post: { effective: [] } }))).type,
    ).toBe('group')
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
    const rule = hasGroupPermission('group.chat.write', byRoom('roomId'))
    const context = contextFor({ room: { effective: ['group.chat.write'] } })

    expect(await resolve(rule, {}, { roomId: 'r1' }, context)).toBe(true)
  })

  it('asks the group for the right when one was found', async () => {
    const rule = hasGroupPermission('group.post.create')
    const holding = contextFor({ group: { effective: ['group.post.create'] } })
    const withholding = contextFor({ group: { effective: [] } })

    expect(await resolve(rule, {}, { groupId: 'g1' }, holding)).toBe(true)
    expect(await resolve(rule, {}, { groupId: 'g1' }, withholding)).toBe(false)
  })

  it('says so when the groups feature is off', async () => {
    // Posting to a room cannot put `groupsEnabled` in front — it may be a direct message — so the
    // reason has to come from here once the room turns out to belong to a group.
    const rule = hasGroupPermission('group.chat.write', byRoom('roomId'))
    const context = contextFor({ room: { effective: [] }, groupsEnabled: false })

    expect(await resolve(rule, {}, { roomId: 'r1' }, context)).toMatchObject({
      extensions: { errorCode: 'GROUPS_FEATURE_DISABLED' },
    })
  })

  describe('with a reason for somebody who is not a member', () => {
    const rule = hasGroupPermission(
      'group.invite',
      byArg('groupId'),
      () => new AppError(Errors.INVITE_CODE_CREATE_GROUP_MEMBERSHIP_REQUIRED),
    )
    const notMember = { extensions: { errorCode: 'INVITE_CODE_CREATE_GROUP_MEMBERSHIP_REQUIRED' } }

    it('gives it to somebody without a membership', async () => {
      const context = contextFor({ group: { isMember: false, effective: [] } })

      expect(await resolve(rule, {}, { groupId: 'g1' }, context)).toMatchObject(notMember)
    })

    it('gives the same answer for a group that does not exist', async () => {
      // Otherwise the answer would tell a stranger which hidden groups are there.
      expect(await resolve(rule, {}, { groupId: 'g1' }, contextFor({ group: null }))).toMatchObject(
        notMember,
      )
    })

    it('keeps the default for a member who merely lacks the right', async () => {
      // What a member's role may do is the group's business; the member is told no more.
      const context = contextFor({ group: { isMember: true, effective: [] } })

      expect(await resolve(rule, {}, { groupId: 'g1' }, context)).toBe(false)
    })

    it('keeps the default for a guest, who could not get a membership anyway', async () => {
      const context = contextFor({ user: null, group: { isMember: false, effective: [] } })

      expect(await resolve(rule, {}, { groupId: 'g1' }, context)).toBe(false)
      expect(
        await resolve(rule, {}, { groupId: 'g1' }, contextFor({ user: null, group: null })),
      ).toBe(false)
    })

    it('lets through whoever holds the right, member or not', async () => {
      // A network admin acting in the group holds it without a membership.
      const context = contextFor({ group: { isMember: false, effective: ['group.invite'] } })

      expect(await resolve(rule, {}, { groupId: 'g1' }, context)).toBe(true)
    })
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

describe('canChangeVisibility', () => {
  it('allows a request that does not touch the type', async () => {
    const context = contextFor({ group: { visibility: 'public' } })

    expect(await resolve(canChangeVisibility, {}, { id: 'g1' }, context)).toBe(true)
    expect(await resolve(canChangeVisibility, {}, { id: 'g1', visibility: null }, context)).toBe(
      true,
    )
  })

  it('denies for a group that does not exist', async () => {
    const context = contextFor({ group: null })

    expect(
      await resolve(canChangeVisibility, {}, { id: 'g1', visibility: 'hidden' }, context),
    ).toBe(false)
  })

  it('allows sending the type the group already has', async () => {
    // The group form posts every field it knows, so demanding the right for an unchanged value
    // would stop an owner who may not create hidden groups from editing the hidden group they
    // already own.
    const context = contextFor({ group: { visibility: 'hidden', effective: [] } })

    expect(
      await resolve(canChangeVisibility, {}, { id: 'g1', visibility: 'hidden' }, context),
    ).toBe(true)
  })

  it('needs the creation right for the target level, too (E10)', async () => {
    // The cap: switching to a more private type is the same act as creating the group that
    // way, so it asks the same right. Without it, "public now, hidden in a minute" is the way
    // around `group.create_hidden`.
    const holder = contextFor({
      group: { visibility: 'public', effective: ['group.role.manage'] },
      network: ['group.create_hidden'],
    })
    const without = contextFor({
      group: { visibility: 'public', effective: ['group.role.manage'] },
      network: ['group.create_public'],
    })

    expect(await resolve(canChangeVisibility, {}, { id: 'g1', visibility: 'hidden' }, holder)).toBe(
      true,
    )
    // Refused with the reason, not with `false`: it is the network right that is missing.
    expect(
      await resolve(canChangeVisibility, {}, { id: 'g1', visibility: 'hidden' }, without),
    ).toMatchObject({ extensions: { errorCode: 'GROUP_VISIBILITY_RAISE_NOT_PERMITTED' } })
  })

  it('asks for no creation right when the switch opens the group up', async () => {
    // Opening takes nothing away from people outside the group.
    const context = contextFor({
      group: { visibility: 'hidden', effective: ['group.role.manage'] },
      network: [],
    })

    expect(
      await resolve(canChangeVisibility, {}, { id: 'g1', visibility: 'public' }, context),
    ).toBe(true)
  })

  it('needs the right for an actual change', async () => {
    const withRight = contextFor({
      group: { visibility: 'public', effective: ['group.role.manage'] },
      network: ['group.create_closed'],
    })
    const without = contextFor({ group: { visibility: 'public', effective: [] } })

    expect(
      await resolve(canChangeVisibility, {}, { id: 'g1', visibility: 'closed' }, withRight),
    ).toBe(true)
    expect(
      await resolve(canChangeVisibility, {}, { id: 'g1', visibility: 'closed' }, without),
    ).toBe(false)
  })
})

describe('canChangeMemberListAccess', () => {
  // The deprecated `showMembers` writes `group.members.read` on the non-member role, so it asks
  // what editing that role asks. It used to need only `group.settings.manage`.
  const closedGroup = (effective: string[]) => ({ visibility: 'closed', effective })

  it('allows a request that does not touch the member list', async () => {
    const context = contextFor({ group: closedGroup([]) })

    expect(await resolve(canChangeMemberListAccess, {}, { id: 'g1' }, context)).toBe(true)
  })

  it('denies for a group that does not exist', async () => {
    const context = contextFor({ group: null })

    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: true }, context),
    ).toBe(false)
  })

  it('allows sending the value the group already has', async () => {
    // Older clients post every field of the form on every save.
    const context = contextFor({
      group: closedGroup(['group.settings.manage']),
      rolePermissions: ['group.read', 'group.members.read'],
    })

    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: true }, context),
    ).toBe(true)
  })

  it('leaves a group that is not closed to the setting it never governed', async () => {
    // The current form sends `showMembers: false` on every save. On a public group that never
    // closed anything, so it must not cost an admin a right they do not hold.
    const admin = contextFor({
      group: { visibility: 'public', effective: ['group.settings.manage'] },
      rolePermissions: ['group.read', 'group.content.read', 'group.members.read'],
    })

    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: false }, admin),
    ).toBe(true)
  })

  it('judges the group as it will be, when the same request makes it closed', async () => {
    const admin = contextFor({
      group: { visibility: 'public', effective: ['group.settings.manage'] },
      rolePermissions: ['group.read', 'group.content.read', 'group.members.read'],
    })

    expect(
      await resolve(
        canChangeMemberListAccess,
        {},
        { id: 'g1', visibility: 'closed', showMembers: false },
        admin,
      ),
    ).toBe(false)
  })

  it('needs group.role.manage for an actual change, not group.settings.manage', async () => {
    const admin = contextFor({
      group: closedGroup(['group.settings.manage', 'group.members.read']),
      rolePermissions: ['group.read'],
    })

    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: true }, admin),
    ).toBe(false)
  })

  it('needs the right itself to open the list, as handing out any right does', async () => {
    const without = contextFor({
      group: closedGroup(['group.role.manage']),
      rolePermissions: ['group.read'],
    })
    const holder = contextFor({
      group: closedGroup(['group.role.manage', 'group.members.read']),
      rolePermissions: ['group.read'],
    })

    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: true }, without),
    ).toBe(false)
    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: true }, holder),
    ).toBe(true)
  })

  it('closes the list with group.role.manage alone — taking a right away grants nothing', async () => {
    const context = contextFor({
      group: closedGroup(['group.role.manage']),
      rolePermissions: ['group.read', 'group.members.read'],
    })

    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: false }, context),
    ).toBe(true)
  })

  it('reads a group without a non-member role as one with a closed list', async () => {
    const context = contextFor({ group: closedGroup([]), rolePermissions: null })

    expect(
      await resolve(canChangeMemberListAccess, {}, { id: 'g1', showMembers: false }, context),
    ).toBe(true)
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

  it('treats adding somebody ELSE as giving them a role', async () => {
    // Before this rule, any authenticated user could add any other user to a public group.
    // `group.join` is about one's OWN membership, so it says nothing about another person.
    const approver = contextFor({ group: { effective: ['group.member.role.assign'] } })
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
      rolePermissions: ['group.role.manage'],
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
      rolePermissions: ['group.role.manage'],
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

  it('lets an elevated network admin re-role an owner, their peer by rights', async () => {
    const owner = ['group.member.role.assign', 'group.invite']
    const peer = contextFor({
      group: { effective: owner },
      rolePermissions: ['group.invite'],
      memberRole: 'owner',
      memberPermissions: owner,
    })
    const elevated = contextFor({
      group: { effective: owner, outranksMembers: true },
      rolePermissions: ['group.invite'],
      memberRole: 'owner',
      memberPermissions: owner,
    })

    expect(await resolve(canAssignGroupRole, {}, args, peer)).toBe(false)
    expect(await resolve(canAssignGroupRole, {}, args, elevated)).toBe(true)
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

  it('lets an elevated network admin remove an owner, their peer by rights', async () => {
    const elevated = contextFor({
      group: { effective: ['group.member.remove'], outranksMembers: true },
      memberPermissions: ['group.member.remove'],
    })

    expect(
      await resolve(canRemoveGroupMember, {}, { groupId: 'g1', userId: 'other' }, elevated),
    ).toBe(true)
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
    const context = contextFor({ queryRecords: [row({ visibility: null, readableHere: false })] })

    expect(await resolve(canReviewReportedContent, {}, { resourceId: 'p1' }, context)).toBe(true)
  })

  it('allows it when the group itself says the content is readable', async () => {
    // Either it opened its content to non-members, or this moderator`s role in it grants
    // reading — the query answers both as `readableHere`.
    const context = contextFor({
      queryRecords: [row({ visibility: 'closed', readableHere: true })],
    })

    expect(await resolve(canReviewReportedContent, {}, { resourceId: 'p1' }, context)).toBe(true)
  })

  it('falls back to the per-type network right', async () => {
    const records = [row({ visibility: 'closed', readableHere: false })]
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
