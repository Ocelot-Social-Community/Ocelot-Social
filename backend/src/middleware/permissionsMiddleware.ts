/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { createRequire } from 'node:module'

import CONFIG from '@config/index'
import { AuthenticationError } from '@graphql/errors'
import { validateInviteCode } from '@graphql/resolvers/inviteCodes'
import { coversRole, mayAssignGroupRole, mayRemoveGroupMember } from '@src/groupRole'
import { isPermissionAvailable } from '@src/permission'
import { dominates } from '@src/role'

import type { Context } from '@src/context'
import type { GroupPermissionKey } from '@src/groupPermission'
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
export const groupCreatePermissionForType = (groupType: string): PermissionKey | null => {
  switch (groupType) {
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
const canCreateGroup = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  const permission = groupCreatePermissionForType(args.groupType)
  // Same check as hasPermission(), but the permission depends on the requested groupType,
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
  return validateInviteCode(context, inviteCode)
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
    const location = await locate((args ?? {}) as Record<string, unknown>, ctx)
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

// Changing the group TYPE is its own right on top of the settings right, because it flips the
// visibility of everything inside — and it is capped by the network right to create a group of
// the target type, so switching is never a way around group.create_<type>.
const canChangeGroupType = rule({ cache: 'no_cache' })(async (_parent, args, ctx: Context) => {
  if (args.groupType === undefined || args.groupType === null) {
    return true
  }
  const authorization = await ctx.groupAuthorization.forGroup(args.id)
  return !!authorization && authorization.has('group.type.change')
})

// Joining is two different acts sharing one mutation: joining oneself, and adding somebody
// else. The first is governed by group.join / group.join.request (which of the two the viewer
// holds also decides whether they land as a member or as an applicant — the resolver reads the
// same pair), the second is membership management and needs group.member.approve. Before this,
// ANY authenticated user could add ANY other user to a public or closed group.
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
  return authorization.has('group.member.approve')
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
  const { groupId, userId, roleInGroup } = args
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
      review: and(hasPermission('content.moderate'), canModerateTargetUser),
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
      groupType: allow,
      // The member count is part of the member list, not a separate fact: in a small group
      // "3 members" plus a known owner is nearly the list itself (concept E7). Still behind
      // isAuthenticated as well, so switching the right on for non-members of a public group
      // does not silently expose it to anonymous visitors too.
      membersCount: and(isAuthenticated, parentHasGroupPermission('group.members.read')),
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
