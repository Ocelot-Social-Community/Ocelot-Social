/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { createRequire } from 'node:module'

import CONFIG from '@config/index'
import { AuthenticationError, UserInputError } from '@graphql/errors'
import {
  memberRoleHolds,
  nonMemberReadsContent,
  optionalMemberRoleMatch,
  visibilityOf,
} from '@graphql/resolvers/helpers/groupAccessCypher'
import { inviteCodeAllowsRegistration } from '@graphql/resolvers/inviteCodes'
import {
  coversRole,
  createPermissionForLevel,
  isMorePrivate,
  mayAssignGroupRole,
  mayRemoveGroupMember,
} from '@src/groupRole'
import { isPermissionAvailable } from '@src/permission'
import { dominates } from '@src/role'

import type { Context } from '@src/context'
import type { GroupPermissionKey } from '@src/groupPermission'
import type { GroupPrivacyLevel } from '@src/groupRole'
import type { GroupAuthorization } from '@src/groupRole/requestScope'
import type { PermissionKey } from '@src/permission'
import type {
  allow as Allow,
  and as And,
  deny as Deny,
  or as Or,
  rule as Rule,
  shield as Shield,
} from 'graphql-shield'

// Loaded through createRequire because graphql-shield 7.6.5's ESM build is broken: `esm/rules.js`
// does `import { isUndefined } from 'util'`, and Node's `util` ESM namespace has no such export
// (it is a deprecated CommonJS-only property), so importing the package the normal way throws at
// load. Its `exports` map offers no subpath, so the working CJS build cannot be addressed
// directly either. The type import below still comes from the package's own declarations, so
// this costs no type safety — only the illusion that the package supports ESM.
// Revisit when graphql-shield ships a fixed ESM build.
const { rule, shield, deny, allow, or, and } = createRequire(import.meta.url)('graphql-shield') as {
  rule: typeof Rule
  shield: typeof Shield
  deny: typeof Deny
  allow: typeof Allow
  or: typeof Or
  and: typeof And
}

const debug = !!CONFIG.DEBUG
const allowExternalErrors = true

const isAuthenticated = rule({
  cache: 'contextual',
})(async (_parent, _args, ctx, _info) => {
  return !!ctx?.user?.id
})

// Generic permission gate. Reads the per-request effective permission set that
// the context resolves from the user's roles (RoleService). This REPLACES the
// former role-string checks (isAdmin / isModerator): the operation→permission
// mapping below stays in code (under review), only role→permission is dynamic
// data. The permission argument is typed against the catalog, so a typo or a
// removed key is a compile-time error (the shield→catalog drift guard).
// The single source of truth for "does this request currently hold this permission":
// the right must be in the resolved effective set AND its runtime feature gate (if any)
// must be open — e.g. apiKey.create needs the apiKeysEnabled policy. Couples the right to
// its env/policy flag in one place so every caller inherits identical semantics.
const hasPermissionEffective = (ctx: Context, permission: PermissionKey): boolean =>
  ctx.effectivePermissions.has(permission) && isPermissionAvailable(permission, ctx)

const hasPermission = (permission: PermissionKey) =>
  rule({ cache: 'contextual' })(async (_parent, _args, ctx: Context) =>
    hasPermissionEffective(ctx, permission),
  )

// Flat per-group-type creation rights (mirrors videoCall.create_*): creating a group
// of a given type needs exactly that type's permission, independent of the others.
// Exported for the drift test in permissionsMiddleware.spec.ts, which asserts that EVERY value of
// the GroupType enum still maps to a permission. That is what the `default` below is for: a
// fourth group type added to the schema and not to this switch must be refused, not created.
export const groupCreatePermissionFor = (visibility: string): PermissionKey | null => {
  switch (visibility) {
    case 'public':
      return 'group.create_public'
    case 'closed':
      return 'group.create_closed'
    case 'hidden':
      return 'group.create_hidden'
    default:
      return null
  }
}
/** The visibility a request asks for, where it asks for one at all. */
const requestedVisibility = (args: Record<string, unknown>): string | null =>
  (args.visibility as string | null) ?? null

const canCreateGroup = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  // `visibility` is non-null on CreateGroup, so a request without it never reaches this rule —
  // validation rejects it first. Only an unknown value is possible here, and that one
  // groupCreatePermissionFor answers with null.
  const permission = groupCreatePermissionFor(args.visibility as string)
  // Same check as hasPermission(), but the permission depends on the requested visibility,
  // so it can't be a static hasPermission() gate. group.create_* is gated by groupsEnabled,
  // so hasPermissionEffective also blocks creation when groups are off.
  return !!permission && hasPermissionEffective(ctx, permission)
})

const apiKeysEnabled = rule({ cache: 'contextual' })(async (
  _parent,
  _args,
  { policy }: Context,
) => {
  return policy.get('apiKeysEnabled')
})

// Editing/deleting a social-media link is owner-gated, not permission-gated, so it
// does not inherit the socialMediaEnabled gate via hasPermission() the way
// CreateSocialMedia (socialMedia.create) does. Combine this with isMySocialMedia so
// the whole feature — create, edit, delete — hangs off the one policy toggle.
const socialMediaEnabled = rule({ cache: 'contextual' })(async (
  _parent,
  _args,
  { policy }: Context,
) => {
  return policy.getEffective('socialMediaEnabled')
})

// The whole groups feature hangs off one policy toggle. Group creation is already gated
// via the group.create_* permissions (gatedBy groupsEnabled); this rule gates the rest —
// viewing/browsing groups and every group mutation that is NOT permission-based (join,
// leave, member management, invites, group rooms/calls) — so nothing group-related is
// reachable over the API while the feature is off. getEffective, so it also respects any
// (future) env dependency the policy declares.
const groupsEnabled = rule({ cache: 'contextual' })(async (_parent, _args, { policy }: Context) => {
  return policy.getEffective('groupsEnabled')
})

// Gates the dev/test-only cache-resync trigger: db:reset/db:seed and the e2e harness
// must be able to call it when no users exist yet (right after a wipe), so it is open
// outside production and fully disabled in production. Prod cache resyncs are handled
// by a rolling restart (each instance re-reads the DB on boot), not this mutation.
const isNotProduction = rule({ cache: 'contextual' })(async () => !CONFIG.PRODUCTION)

const onlyYourself = rule({
  cache: 'no_cache',
})(async (_parent, args, context: Context, _info) => {
  return context.user?.id === args.id
})

const isMyOwn = rule({
  cache: 'no_cache',
})(async (parent, _args, { user }: Context, _info) => {
  return !!(user && user.id === parent.id)
})

const isMySocialMedia = rule({
  cache: 'no_cache',
})(async (_, args, context: Context) => {
  const { user } = context
  if (!user) {
    return false
  }
  // One question, one query: does an OWNED_BY edge run from this entry to the viewer? The
  // neode version loaded the node, serialised it with its eager `ownedBy` relation and then
  // compared an id out of that — three round trips for a boolean.
  const result = await context.database.query({
    query: `
      MATCH (socialMedia:SocialMedia {id: $id})-[:OWNED_BY]->(owner:User {id: $userId})
      RETURN count(owner) > 0 AS isMine
    `,
    variables: { id: args.id, userId: user.id },
  })
  return Boolean(result.records[0]?.get('isMine'))
})

const isAuthor = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user) {
    return false
  }
  const { id: resourceId } = args
  const session = driver.session()
  const authorReadTxPromise = session.readTransaction(async (transaction) => {
    const authorTransactionResponse = await transaction.run(
      `
        MATCH (resource {id: $resourceId})<-[:WROTE]-(author {id: $userId})
        RETURN author
      `,
      { resourceId, userId: user.id },
    )
    return authorTransactionResponse.records.map((record) => record.get('author'))
  })
  try {
    const [author] = await authorReadTxPromise
    return !!author
  } finally {
    await session.close()
  }
})

const isDeletingOwnAccount = rule({
  cache: 'no_cache',
})(async (_parent, args, context: Context, _info) => {
  return context.user?.id === args.id
})

// The target user's effective permission set, resolved from their single role
// (owner ⇒ full catalog, edgeless/unknown ⇒ baseline) — the same resolution the
// request context applies to the actor (context/index.ts).
const effectivePermissionsOfUser = async (
  context: Context,
  userId: string,
): Promise<Set<PermissionKey>> => {
  const result = await context.database.query({
    query: `OPTIONAL MATCH (u:User {id: $userId})-[:HAS_ROLE]->(r:Role)
            RETURN coalesce(r.name, 'user') AS roleName`,
    variables: { userId },
  })
  // Exactly one row, always: an OPTIONAL MATCH that finds nothing still returns a row with a null
  // `r`, and the coalesce turns that into 'user'. No JS-side fallback needed — the two that used
  // to be here could not run.
  const roleName = result.records[0].get('roleName') as string
  return context.role.permissionsForRole(roleName)
}

// Act-on hierarchy guard for per-user destructive actions (delete, disable): the
// actor may only act on a target whose permissions are a STRICT SUBSET of theirs
// (dominates() — see role/dominance.ts). Closes the privilege-escalation hole
// where a holder of user.delete.any / user.disable could act on a peer or a
// higher-privileged user (admin/owner). The gating permission itself is checked
// separately via hasPermission(); this rule only enforces the relative ranking.
const canActOnTargetUser = rule({ cache: 'no_cache' })(async (_parent, args, context: Context) => {
  const targetId = args.id as string | undefined
  // Fail closed. Every mutation this rule is attached to today declares `id: ID!`, so the schema
  // makes this unreachable — it is here so that attaching the rule to a mutation whose target
  // argument is named differently DENIES rather than silently skipping the hierarchy check.
  /* v8 ignore next 3 -- unreachable while every guarded mutation declares a non-null id */
  if (!targetId) {
    return false
  }
  const targetPermissions = await effectivePermissionsOfUser(context, targetId)
  return dominates(context.effectivePermissions, targetPermissions)
})

// Same hierarchy guard for the report `review` mutation, which can disable the
// reported resource. Only Users carry a role, so Posts/Comments pass through; a
// reported User is subject to the dominance rule (a moderator must not disable an
// admin/owner by reviewing a report against them).
const canModerateTargetUser = rule({ cache: 'no_cache' })(async (
  _parent,
  args,
  context: Context,
) => {
  const resourceId = args.resourceId as string | undefined
  // Same fail-closed guard as canActOnTargetUser: `review(resourceId: ID!)` makes it unreachable
  // through the schema, and it stays so a differently-named argument denies instead of passing.
  /* v8 ignore next 3 -- unreachable while review declares a non-null resourceId */
  if (!resourceId) {
    return false
  }
  // Self-review is a conflict-of-interest case, not a privilege-escalation one: you can
  // never strictly dominate your own permission set, so the dominance check below would
  // reject it with a generic "Not Authorized!". Let it pass here and leave it to
  // validateReview, which rejects self-review with the specific "You cannot review
  // yourself!" message. Self stays blocked — just by the rule that owns that concern.
  if (resourceId === context.user?.id) {
    return true
  }
  const result = await context.database.query({
    query: `MATCH (resource {id: $resourceId})
              OPTIONAL MATCH (resource)-[:HAS_ROLE]->(r:Role)
              RETURN 'User' IN labels(resource) AS isUser, coalesce(r.name, 'user') AS roleName`,
    variables: { resourceId },
  })
  const row = result.records[0]
  // Resource not found — let the resolver handle it; no user can be escalated.
  if (!row) {
    return true
  }
  if (!(row.get('isUser') as boolean)) {
    return true
  }
  // coalesce() in the statement above already guarantees a name, same as in
  // effectivePermissionsOfUser.
  const targetPermissions = context.role.permissionsForRole(row.get('roleName') as string)
  return dominates(context.effectivePermissions, targetPermissions)
})

// No blind moderation: a report whose subject sits in a group this moderator may not read is
// masked in the queue (concept E19), so deciding it would mean deciding about something they
// cannot see. It needs escalating to somebody who holds group.content.read.any_<type>.
const canReviewReportedContent = rule({ cache: 'no_cache' })(async (
  _parent,
  args,
  ctx: Context,
) => {
  const resourceId = args.resourceId as string | undefined
  if (!resourceId) {
    return false
  }
  const result = await ctx.database.query({
    // The same question the moderation queue asks when it decides what to blank (see
    // resolvers/reports.ts): the group's own answer first — it opened its content to
    // non-members, or this moderator's role in it grants reading — and only then the
    // per-type network right below.
    query: `MATCH (resource {id: $resourceId})
            OPTIONAL MATCH (resource)-[:IN]->(direct:Group)
            OPTIONAL MATCH (resource)-[:COMMENTS]->(:Post)-[:IN]->(viaPost:Group)
            WITH coalesce(direct, viaPost) AS group
            ${optionalMemberRoleMatch('group', '$viewerId')}
            RETURN ${visibilityOf('group')} AS visibility,
                   (group IS NULL
                     OR ${nonMemberReadsContent('group')}
                     OR ${memberRoleHolds('group.content.read')}) AS readableHere`,
    variables: { resourceId, viewerId: ctx.user?.id ?? null },
  })
  const record = result.records[0]
  const visibility = record?.get('visibility') as string | null
  if (!visibility || record?.get('readableHere') === true) {
    return true
  }
  return hasPermissionEffective(ctx, `group.content.read.any_${visibility}` as PermissionKey)
})

// Holding any of the per-type administration rights is what opens the admin group list; the
// resolver then restricts the result to exactly those types.
const canAdministerSomeGroup = rule({ cache: 'contextual' })(async (_parent, _args, ctx: Context) =>
  ['public', 'closed', 'hidden'].some((visibility) =>
    hasPermissionEffective(ctx, `group.administer.any_${visibility}` as PermissionKey),
  ),
)

const noEmailFilter = rule({
  cache: 'no_cache',
})(async (_, args) => {
  return !('email' in args)
})

const publicRegistration = rule()(async (_parent, _args, context: Context) =>
  context.policy.get('publicRegistration'),
)

const inviteRegistration = rule()(async (_parent, args, context: Context) => {
  if (!context.policy.get('inviteRegistration')) {
    return false
  }
  const { inviteCode } = args
  // Registering with a code is the question here, not whether the code is alive: a group
  // invite without `group.invite.external` brings people INTO a group, it does not open the
  // network's door (E11).
  return inviteCodeAllowsRegistration(context, inviteCode)
})

// ─────────────────────────────────────────────────────────────────────────────────────────
// Group-scoped authorization.
//
// One rule for every group right — `hasGroupPermission(key, locator)` — where the locator
// says which argument carries the group. Explicit per entry rather than a chain of fallbacks,
// so the shield map states where the group comes from and a renamed argument cannot silently
// resolve through something else. The answer itself comes from context.groupAuthorization,
// which resolves a group once per request (see groupRole/requestScope.ts).

type GroupLocation =
  // A group was named and found: check the right against it.
  | { type: 'group'; authorization: GroupAuthorization }
  // An id was given but no group came back — deny, the operation cannot be authorized.
  | { type: 'notFound' }
  // Nothing named a group: the operation has no group context, so the network permission
  // alone decides (a post outside any group, a direct-message room).
  | { type: 'noGroup' }

type GroupLocator = (args: Record<string, unknown>, ctx: Context) => Promise<GroupLocation>

const stringArg = (args: Record<string, unknown>, name: string): string | null => {
  const value = args[name] // eslint-disable-line security/detect-object-injection -- name is a literal at every call site
  return typeof value === 'string' && value !== '' ? value : null
}

/** The group is named directly by an argument (`groupId`, or `id` on group operations). */
const byArg =
  (argument: string): GroupLocator =>
  async (args, ctx) => {
    const groupId = stringArg(args, argument)
    if (groupId === null) {
      return { type: 'noGroup' }
    }
    const authorization = await ctx.groupAuthorization.forGroup(groupId)
    return authorization ? { type: 'group', authorization } : { type: 'notFound' }
  }

/** The group is the one a post lives in. A post outside any group carries no group context. */
const byPost =
  (argument: string): GroupLocator =>
  async (args, ctx) => {
    const postId = stringArg(args, argument)
    if (postId === null) {
      return { type: 'noGroup' }
    }
    const authorization = await ctx.groupAuthorization.forPost(postId)
    return authorization ? { type: 'group', authorization } : { type: 'noGroup' }
  }

/** The group a chat room belongs to. A direct-message room belongs to none. */
const byRoom =
  (argument: string): GroupLocator =>
  async (args, ctx) => {
    const roomId = stringArg(args, argument)
    if (roomId === null) {
      return { type: 'noGroup' }
    }
    const authorization = await ctx.groupAuthorization.forRoom(roomId)
    return authorization ? { type: 'group', authorization } : { type: 'noGroup' }
  }

const hasGroupPermission = (
  permission: GroupPermissionKey,
  locate: GroupLocator = byArg('groupId'),
) =>
  rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
    const location = await locate(args as Record<string, unknown>, ctx)
    if (location.type === 'notFound') {
      return false
    }
    if (location.type === 'noGroup') {
      return true
    }
    return location.authorization.has(permission)
  })

/** Field rules on the Group type: the group is the parent object. */
const parentHasGroupPermission = (permission: GroupPermissionKey) =>
  rule({ cache: 'no_cache' })(async (parent, _args, ctx: Context) => {
    const groupId = (parent as { id?: string } | null)?.id
    if (typeof groupId !== 'string') {
      return false
    }
    const authorization = await ctx.groupAuthorization.forGroup(groupId)
    return !!authorization && authorization.has(permission)
  })

// Setting the visibility writes the matching role template onto the group's non-member and
// applicant roles — so it asks for the right that governs roles, capped by the network right to
// CREATE a group that private (E10): switching is never a way around group.create_<visibility>.
/**
 * Creating a group-defined role is switched off for now (#10356).
 *
 * Returns the reason rather than `false`: graphql-shield passes an Error through as the
 * message, and "Not Authorized!" would send an owner looking for a right they are missing
 * instead of telling them the capability is not there yet.
 */
const groupRolesAreFixed = rule({ cache: 'no_cache' })(
  () => new UserInputError('Groups cannot define their own roles yet!'),
)

const canChangeGroupType = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  const requested = requestedVisibility(args)
  if (requested === null) {
    return true
  }
  const authorization = await ctx.groupAuthorization.forGroup(args.id)
  if (!authorization) {
    return false
  }
  // Sending the type the group already has is not a change. The group form posts every field
  // it knows, so demanding the right for an unchanged value would stop an owner who may not
  // create hidden groups from editing the hidden group they already own.
  if (requested === authorization.visibility) {
    return true
  }
  // Setting the type IS editing the group's non-member and applicant roles — the preset writes
  // them, and the type is derived back out of them. So it asks for the right that governs those
  // roles rather than one of its own: a separate `group.type.change` would have been a second
  // name for `group.role.manage` restricted to one way of using it.
  if (!authorization.has('group.role.manage')) {
    return false
  }
  // And the network cap (E10): switching to a more private type needs the right to have
  // created the group that way, or "public now, hidden in a minute" is the way around
  // `group.create_hidden`. The same cap guards the rights matrix, which is the other way to
  // the same result (see requirePrivacyCap in resolvers/groupRoles.ts).
  const target = requested as GroupPrivacyLevel
  if (!isMorePrivate(target, authorization.visibility as GroupPrivacyLevel)) {
    return true
  }
  const needed = createPermissionForLevel(target)
  return !!needed && hasPermissionEffective(ctx, needed)
})

// Joining is two different acts sharing one mutation: joining oneself, and adding somebody
// else. The first is governed by group.join / group.join.request (which of the two the viewer
// holds also decides whether they land as a member or as an applicant — the resolver reads the
// same pair). The second gives another person a role in the group, which is what
// group.member.role.assign names.
//
// There is no separate approve right because approving is the same act: an applicant is
// promoted by ChangeGroupMemberRole (pending → usual), which this right already guards, and
// the members tab lists applicants (`includePending`) with that dropdown. What is missing is
// an affordance built for it — accept/decline, a count, a notification — which is #10352.
// Before any of this, ANY authenticated user could add ANY other user to a public group.
const canJoinGroup = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  if (!ctx.user) {
    return false
  }
  const authorization = await ctx.groupAuthorization.forGroup(args.groupId)
  if (!authorization) {
    return false
  }
  if (args.userId === ctx.user.id) {
    return authorization.has('group.join') || authorization.has('group.join.request')
  }
  return authorization.has('group.member.role.assign')
})

// Leaving is about one's own membership only; removing somebody else is RemoveUserFromGroup.
const isLeavingSelf = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  return !!ctx.user && ctx.user.id === args.userId
})

// Changing a member's role: the right, plus the two act-on rules from groupRole/authority.ts —
// dominance over the member as they are now, and coverage of the role they would become.
const canAssignGroupRole = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  if (!ctx.user) {
    return false
  }
  const { groupId, userId } = args
  // ChangeGroupMemberRole calls it roleInGroup, its successor setGroupMemberRole calls it
  // roleName. One rule serves both while the deprecated mutation is still around.
  const roleInGroup = (args.roleName ?? args.roleInGroup) as string | undefined
  if (typeof roleInGroup !== 'string') {
    return false
  }
  const authorization = await ctx.groupAuthorization.forGroup(groupId)
  if (!authorization?.has('group.member.role.assign')) {
    return false
  }
  const assigned = await ctx.groupAuthorization.rolePermissions(groupId, roleInGroup)
  if (assigned === null) {
    return false
  }
  if (userId === ctx.user.id) {
    // Changing one's OWN role: coverage alone. Dominance can never hold against oneself, and
    // demoting yourself is not an act of power over anybody — it is what an owner does when
    // handing a group over (#6173), and with an owner-less group being legal it needs no
    // second owner to exist first.
    return coversRole(authorization.effective, assigned)
  }
  // Assigning the role somebody already holds changes nothing, so it does not need the
  // authority to change them — and the group UI sends it (a role picker set to its current
  // value). The old rule had the same exception, spelled `sameUserRoleInGroup`.
  const current = await ctx.groupAuthorization.forGroupMemberRole(groupId, userId)
  if (current === roleInGroup) {
    return true
  }
  const target = await ctx.groupAuthorization.memberPermissions(groupId, userId)
  return mayAssignGroupRole(authorization.effective, target, assigned)
})

const canRemoveGroupMember = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  if (!ctx.user || ctx.user.id === args.userId) {
    return false
  }
  const authorization = await ctx.groupAuthorization.forGroup(args.groupId)
  if (!authorization) {
    return false
  }
  const target = await ctx.groupAuthorization.memberPermissions(args.groupId, args.userId)
  return mayRemoveGroupMember(authorization.effective, target)
})

// Exported for permissionsMiddleware.group.spec.ts.
//
// These rules ARE the group authorization, and several of their arms cannot be reached through
// a GraphQL request at all: a group id that resolves to nothing, an argument the schema types
// as non-null, a parent object the server builds itself. Asserting them directly is the
// difference between a guard that holds and a guard that is merely written down. The shield map
// below is their only production user.
export const groupAuthorizationRules = {
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
}

// Permissions
export default shield(
  {
    Query: {
      '*': deny,
      searchResults: allow,
      searchChatTargets: isAuthenticated,
      searchPosts: allow,
      searchUsers: allow,
      searchGroups: groupsEnabled,
      searchHashtags: allow,
      embed: allow,
      embedProviders: allow,
      Category: allow,
      Tag: allow,
      reports: hasPermission('content.moderate'),
      statistics: hasPermission('network.statistics.read'),
      currentUser: isAuthenticated,
      Group: and(groupsEnabled, isAuthenticated),
      GroupMembers: and(groupsEnabled, hasGroupPermission('group.members.read', byArg('id'))),
      GroupCount: and(groupsEnabled, isAuthenticated),
      Post: allow,
      profilePagePosts: allow,
      Comment: allow,
      User: and(isAuthenticated, or(noEmailFilter, hasPermission('user.email.readAny'))),
      Badge: allow,
      PostsEmotionsCountByEmotion: allow,
      PostsEmotionsByCurrentUser: isAuthenticated,
      mutedUsers: isAuthenticated,
      blockedUsers: isAuthenticated,
      notifications: isAuthenticated,
      Donations: isAuthenticated,
      userData: isAuthenticated,
      VerifyNonce: allow,
      queryLocations: allow,
      permissionCatalog: hasPermission('role.manage'),
      roles: hasPermission('role.manage'),
      userRoles: hasPermission('role.manage'),
      myPermissions: isAuthenticated,
      // The group rights catalog is the same for everybody and drives the group rights UI;
      // which of them a viewer holds is Group.myGroupPermissions, resolved per group.
      groupPermissionCatalog: and(groupsEnabled, isAuthenticated),
      groupRoleTemplates: hasPermission('group.roleTemplate.manage'),
      // The NAMES only. Which presets exist is product vocabulary, not a secret — and a group
      // owner has to be able to name one to put it on their group, without being handed the
      // network's template editor.
      groupRoleTemplateNames: and(groupsEnabled, isAuthenticated),
      // The admin group list. One rule for "may administer groups at all"; WHICH groups come
      // back is decided in the resolver by the per-type rights, so a viewer who may only
      // administer public groups cannot enumerate the hidden ones.
      adminGroups: canAdministerSomeGroup,
      adminGroupCount: canAdministerSomeGroup,
      Room: isAuthenticated,
      Message: isAuthenticated,
      UnreadRooms: isAuthenticated,
      videoCallConfig: allow,
      videoCallParticipantCount: and(isAuthenticated, hasGroupPermission('group.videoCall.join')),
      PostsPinnedCounts: hasPermission('post.pin'),

      // Invite Code
      validateInviteCode: allow,

      // API Keys
      myApiKeys: and(isAuthenticated, apiKeysEnabled),
      apiKeyUsers: hasPermission('apiKey.administer'),
      apiKeysForUser: hasPermission('apiKey.administer'),

      // Network Policy — one query for everyone; per-field visibility (which
      // keys a viewer actually receives) is enforced inside the resolver via
      // canView(). Anonymous viewers still need it (login/register screen).
      policy: allow,
      // Configured defaults + last-change audit info are policy-admin-only
      // (deployment config); bundled in the single policyDefaults query.
      policyDefaults: hasPermission('policy.manage'),
      // Per-policy config layers + hard env requirements. Same admin scope as
      // policyDefaults; only env presence state is returned, never secret values.
      policyConfig: hasPermission('policy.manage'),
      // Every recognised env var (registry + policy overlay) for the config tab.
      // Same admin scope; secret values are never returned, only presence state.
      systemConfig: hasPermission('policy.manage'),
    },
    Mutation: {
      '*': deny,
      login: allow,
      // The isAdmin branch (admin-initiated registration) maps to role.manage —
      // user/role administration, which the default admin role holds.
      Signup: or(publicRegistration, inviteRegistration, hasPermission('role.manage')),
      SignupVerification: allow,
      UpdateUser: onlyYourself,
      CreateGroup: and(isAuthenticated, canCreateGroup),
      UpdateGroup: and(
        groupsEnabled,
        hasGroupPermission('group.settings.manage', byArg('id')),
        canChangeGroupType,
      ),
      JoinGroup: and(groupsEnabled, canJoinGroup),
      LeaveGroup: and(groupsEnabled, isLeavingSelf, hasGroupPermission('group.leave')),
      ChangeGroupMemberRole: and(groupsEnabled, canAssignGroupRole),
      RemoveUserFromGroup: and(groupsEnabled, canRemoveGroupMember),
      CreatePost: and(
        isAuthenticated,
        hasPermission('post.create'),
        hasGroupPermission('group.post.create'),
      ),
      UpdatePost: isAuthor,
      DeletePost: isAuthor,
      fileReport: isAuthenticated,
      CreateSocialMedia: and(isAuthenticated, hasPermission('socialMedia.create')),
      UpdateSocialMedia: and(socialMediaEnabled, isMySocialMedia),
      DeleteSocialMedia: and(socialMediaEnabled, isMySocialMedia),
      setVerificationBadge: hasPermission('badge.manage'),
      rewardTrophyBadge: hasPermission('badge.manage'),
      revokeBadge: hasPermission('badge.manage'),
      followUser: isAuthenticated,
      unfollowUser: isAuthenticated,
      shout: isAuthenticated,
      unshout: isAuthenticated,
      changePassword: isAuthenticated,
      review: and(
        hasPermission('content.moderate'),
        canModerateTargetUser,
        canReviewReportedContent,
      ),
      CreateComment: and(
        isAuthenticated,
        hasPermission('comment.create'),
        hasGroupPermission('group.comment.create', byPost('postId')),
      ),
      UpdateComment: isAuthor,
      DeleteComment: isAuthor,
      DeleteUser: or(
        isDeletingOwnAccount,
        and(hasPermission('user.delete.any'), canActOnTargetUser),
      ),
      disableUser: and(hasPermission('user.disable'), canActOnTargetUser),
      requestPasswordReset: allow,
      resetPassword: allow,
      AddPostEmotions: isAuthenticated,
      RemovePostEmotions: isAuthenticated,
      muteUser: isAuthenticated,
      unmuteUser: isAuthenticated,
      blockUser: isAuthenticated,
      unblockUser: isAuthenticated,
      markAsRead: isAuthenticated,
      markAsUnread: isAuthenticated,
      markAllAsRead: isAuthenticated,
      AddEmailAddress: isAuthenticated,
      VerifyEmailAddress: isAuthenticated,
      pinPost: hasPermission('post.pin'),
      unpinPost: hasPermission('post.pin'),
      pinGroupPost: and(groupsEnabled, hasGroupPermission('group.post.pin', byPost('id'))),
      unpinGroupPost: and(groupsEnabled, hasGroupPermission('group.post.pin', byPost('id'))),
      pushPost: hasPermission('post.push'),
      unpushPost: hasPermission('post.push'),
      UpdateDonations: hasPermission('donation.manage'),

      // InviteCode
      generatePersonalInviteCode: and(isAuthenticated, hasPermission('user.invite')),
      generateGroupInviteCode: and(groupsEnabled, hasGroupPermission('group.invite')),
      invalidateInviteCode: isAuthenticated,
      redeemInviteCode: isAuthenticated,

      // API Keys
      // apiKey.create is gated by the apiKeysEnabled policy via the catalog (gatedBy),
      // so hasPermission() already enforces the toggle — no separate apiKeysEnabled here.
      createApiKey: and(isAuthenticated, hasPermission('apiKey.create')),
      updateApiKey: isAuthenticated,
      revokeApiKey: isAuthenticated,
      adminRevokeApiKey: hasPermission('apiKey.administer'),
      adminRevokeUserApiKeys: hasPermission('apiKey.administer'),

      createRole: hasPermission('role.manage'),
      updateRole: hasPermission('role.manage'),
      renameRole: hasPermission('role.manage'),
      deleteRole: hasPermission('role.manage'),
      setUserRole: hasPermission('role.manage'),

      // Group roles: editing a group's own role definitions is the group's meta right, and
      // every one of these additionally requires that the actor holds what they hand out
      // (checked in the resolver, which is where the resulting set is known).
      updateGroupRole: and(groupsEnabled, hasGroupPermission('group.role.manage')),
      // Parked rather than removed (#10356). A group inventing its OWN roles is the corner of
      // this model with the least product around it: nothing tells the owner what a new role is
      // for, the simple view cannot express one, and the matrix is the only way to reach it — so
      // it produces roles whose purpose nobody can read afterwards. The five system roles carry
      // every case the product currently names.
      //
      // In the shield rather than in the resolver, so the resolver stays whole and tested: when
      // the UI has an answer for the sixth role, this line is the only thing to take back out.
      createGroupRole: groupRolesAreFixed,
      renameGroupRole: and(groupsEnabled, hasGroupPermission('group.role.manage')),
      deleteGroupRole: and(groupsEnabled, hasGroupPermission('group.role.manage')),
      resetGroupRoles: and(groupsEnabled, hasGroupPermission('group.role.manage')),
      setGroupMemberRole: and(groupsEnabled, canAssignGroupRole),

      // The network-wide defaults new groups are seeded from, and the bulk application of them
      // to groups that never touched their own roles.
      // Taking a post out of a group: the group's own right, or the network-wide one folded in
      // for a moderator who is not a member.
      removePostFromGroup: and(groupsEnabled, hasGroupPermission('group.post.moderate')),
      // Picking up a network right needs no right of its own: the resolver refuses unless the
      // viewer actually holds something beyond reading in that group, which is the only thing
      // there is to pick up. Authentication is what the shield has to insist on.
      elevateInGroup: and(groupsEnabled, isAuthenticated),
      endGroupElevation: and(groupsEnabled, isAuthenticated),
      updateGroupRoleTemplate: hasPermission('group.roleTemplate.manage'),
      applyGroupRoleTemplates: hasPermission('group.roleTemplate.manage'),
      markTeaserAsViewed: allow,

      // Network Policy
      setPolicy: hasPermission('policy.manage'),
      resetPolicy: hasPermission('policy.manage'),
      resetPolicies: hasPermission('policy.manage'),

      // Branding: switch the live branding (stored as the activeBranding policy value, but
      // gated by its own dedicated right rather than the broad policy.manage).
      setActiveBranding: hasPermission('branding.manage'),
      setBrandingComposition: hasPermission('branding.manage'),

      // Cache resync: dev/test recovery hook only (db:reset/seed + e2e). Disabled in
      // production — fleet resyncs there are done via a rolling restart.
      resyncCaches: isNotProduction,

      saveCategorySettings: isAuthenticated,
      updateOnlineStatus: isAuthenticated,
      CreateGroupRoom: and(
        groupsEnabled,
        isAuthenticated,
        hasGroupPermission('group.chat.participate'),
      ),
      CreateMessage: and(
        isAuthenticated,
        hasGroupPermission('group.chat.participate', byRoom('roomId')),
      ),
      joinGroupVideoCall: and(
        groupsEnabled,
        isAuthenticated,
        hasGroupPermission('group.videoCall.join'),
      ),
      MarkMessagesAsSeen: and(
        isAuthenticated,
        hasGroupPermission('group.chat.participate', byRoom('roomId')),
      ),
      toggleObservePost: isAuthenticated,
      muteGroup: and(groupsEnabled, isAuthenticated, hasGroupPermission('group.content.read')),
      unmuteGroup: and(groupsEnabled, isAuthenticated, hasGroupPermission('group.content.read')),
      setGroupMembershipVisibility: and(
        groupsEnabled,
        isAuthenticated,
        hasGroupPermission('group.content.read'),
      ),
      setTrophyBadgeSelected: isAuthenticated,
      resetTrophyBadgesSelected: isAuthenticated,
    },
    User: {
      '*': isAuthenticated,
      id: allow,
      name: allow,
      slug: allow,
      avatar: allow,
      email: or(isMyOwn, hasPermission('user.email.readAny')),
      emailNotificationSettings: isMyOwn,
      inviteCodes: isMyOwn,
      // Users may read their own role name (for the role badge); role.manage admins
      // read anyone's.
      roleName: or(isMyOwn, hasPermission('role.manage')),
    },
    Group: {
      '*': isAuthenticated,
      slug: allow,
      avatar: allow,
      name: allow,
      about: allow,
      visibility: allow,
      // The two READ rights are not enforced here but in the field resolvers, which blank
      // instead of refusing (see resolvers/groups.ts, mayReadGroup). A rule would null the
      // whole group out of the one list where a group the viewer may not read legitimately
      // appears — their own, with an applicant to a hidden group seeing that they applied.
      //
      // A group's role definitions are its own business; reading them is the same right as
      // editing them, because the matrix IS the editing UI.
      roles: and(isAuthenticated, parentHasGroupPermission('group.role.manage')),
    },
    InviteCode: {
      '*': allow,
      redeemedBy: isAuthenticated, // TODO only for self generated, must be done in resolver
      redeemedByCount: isAuthenticated, // TODO only for self generated, must be done in resolver
      createdAt: isAuthenticated, // TODO only for self generated, must be done in resolver
      expiresAt: isAuthenticated, // TODO only for self generated, must be done in resolver
      comment: isAuthenticated, // TODO only for self generated, must be done in resolver
    },
    Location: {
      distanceToMe: isAuthenticated,
    },
    Report: hasPermission('content.moderate'),
  },
  {
    debug,
    allowExternalErrors,
    fallbackRule: allow,
    fallbackError: new AuthenticationError('Not Authorized!'),
  },
)
