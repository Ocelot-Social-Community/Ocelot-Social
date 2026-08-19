/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { rule, shield, deny, allow, or, and } from 'graphql-shield'

import CONFIG from '@config/index'
import { getNeode } from '@db/neo4j'
import { AuthenticationError } from '@graphql/errors'
import { validateInviteCode } from '@graphql/resolvers/inviteCodes'
import { isPermissionAvailable } from '@src/permission'
import { dominates } from '@src/role'

import type SocialMedia from '@db/models/SocialMedia'
import type { Context } from '@src/context'
import type { PermissionKey } from '@src/permission'

const debug = !!CONFIG.DEBUG
const allowExternalErrors = true

const neode = getNeode()

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
const groupCreatePermissionForType = (groupType: string): PermissionKey | null => {
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
})(async (_, args, { user }: Context) => {
  // We need a User
  if (!user) {
    return false
  }
  const socialMedia = await neode.find<typeof SocialMedia>('SocialMedia', args.id)
  // Did we find a social media node?
  if (!socialMedia) {
    return false
  }
  const socialMediaJson = await socialMedia.toJson() // whats this for?

  // Is it my social media entry?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (socialMediaJson.ownedBy as any).node.id === user.id
})

const isAllowedToChangeGroupSettings = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const ownerId = user.id
  const { id: groupId } = args
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (owner:User {id: $ownerId})-[membership:MEMBER_OF]->(group:Group {id: $groupId})
        RETURN group {.*}, owner {.*, myRoleInGroup: membership.role}
      `,
      { groupId, ownerId },
    )
    return {
      owner: transactionResponse.records.map((record) => record.get('owner'))[0],
      group: transactionResponse.records.map((record) => record.get('group'))[0],
    }
  })
  try {
    const { owner, group } = await readTxPromise
    return !!group && !!owner && ['owner'].includes(owner.myRoleInGroup)
  } finally {
    await session.close()
  }
})

const isAllowedSeeingGroupMembers = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const { id: groupId } = args
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (group:Group {id: $groupId})
        OPTIONAL MATCH (member:User {id: $userId})-[membership:MEMBER_OF]->(group)
        RETURN group {.*}, member {.*, myRoleInGroup: membership.role}
      `,
      { groupId, userId: user.id },
    )
    return {
      member: transactionResponse.records.map((record) => record.get('member'))[0],
      group: transactionResponse.records.map((record) => record.get('group'))[0],
    }
  })
  try {
    const { member, group } = await readTxPromise
    const isMember = !!member && ['usual', 'admin', 'owner'].includes(member.myRoleInGroup)
    return (
      !!group &&
      (group.groupType === 'public' ||
        (['closed', 'hidden'].includes(group.groupType) && isMember) ||
        (group.groupType === 'closed' && group.showMembers === true))
    )
  } finally {
    await session.close()
  }
})

const isAllowedToChangeGroupMemberRole = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const currentUserId = user.id
  const { groupId, userId, roleInGroup } = args
  if (currentUserId === userId) {
    return false
  }
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (currentUser:User {id: $currentUserId})-[currentUserMembership:MEMBER_OF]->(group:Group {id: $groupId})
        OPTIONAL MATCH (group)<-[userMembership:MEMBER_OF]-(member:User {id: $userId})
        RETURN group {.*}, currentUser {.*, myRoleInGroup: currentUserMembership.role}, member {.*, myRoleInGroup: userMembership.role}
      `,
      { groupId, currentUserId, userId },
    )
    return {
      currentUser: transactionResponse.records.map((record) => record.get('currentUser'))[0],
      group: transactionResponse.records.map((record) => record.get('group'))[0],
      member: transactionResponse.records.map((record) => record.get('member'))[0],
    }
  })
  try {
    const { currentUser, group, member } = await readTxPromise
    const groupExists = !!group
    const currentUserExists = !!currentUser
    const userIsMember = !!member
    const sameUserRoleInGroup = member && member.myRoleInGroup === roleInGroup
    const userIsOwner = member && ['owner'].includes(member.myRoleInGroup)
    const currentUserIsAdmin = currentUser && ['admin'].includes(currentUser.myRoleInGroup)
    const adminCanSetRole = ['pending', 'usual', 'admin'].includes(roleInGroup)
    const currentUserIsOwner = currentUser && ['owner'].includes(currentUser.myRoleInGroup)
    const ownerCanSetRole = ['pending', 'usual', 'admin', 'owner'].includes(roleInGroup)
    return (
      groupExists &&
      currentUserExists &&
      (!userIsMember || (userIsMember && (sameUserRoleInGroup || !userIsOwner))) &&
      ((currentUserIsAdmin && adminCanSetRole) || (currentUserIsOwner && ownerCanSetRole))
    )
  } finally {
    await session.close()
  }
})

const isAllowedToJoinGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const { groupId, userId } = args
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (group:Group {id: $groupId})
        OPTIONAL MATCH (group)<-[membership:MEMBER_OF]-(member:User {id: $userId})
        RETURN group {.*}, member {.*, myRoleInGroup: membership.role}
      `,
      { groupId, userId },
    )
    return {
      group: transactionResponse.records.map((record) => record.get('group'))[0],
      member: transactionResponse.records.map((record) => record.get('member'))[0],
    }
  })
  try {
    const { group, member } = await readTxPromise
    return !!group && (group.groupType !== 'hidden' || (!!member && !!member.myRoleInGroup))
  } finally {
    await session.close()
  }
})

const isAllowedToLeaveGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const { groupId, userId } = args
  if (user.id !== userId) {
    return false
  }
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (member:User {id: $userId})-[membership:MEMBER_OF]->(group:Group {id: $groupId})
        RETURN group {.*}, member {.*, myRoleInGroup: membership.role}
      `,
      { groupId, userId },
    )
    return {
      group: transactionResponse.records.map((record) => record.get('group'))[0],
      member: transactionResponse.records.map((record) => record.get('member'))[0],
    }
  })
  try {
    const { group, member } = await readTxPromise
    return !!group && !!member && !!member.myRoleInGroup && member.myRoleInGroup !== 'owner'
  } finally {
    await session.close()
  }
})

const isMemberOfGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const { groupId } = args
  if (!groupId) {
    return true
  }
  const userId = user.id
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (User {id: $userId})-[membership:MEMBER_OF]->(Group {id: $groupId})
        RETURN membership.role AS role
      `,
      { groupId, userId },
    )
    return transactionResponse.records.map((record) => record.get('role'))[0]
  })
  try {
    const role = await readTxPromise
    return ['usual', 'admin', 'owner'].includes(role)
  } finally {
    await session.close()
  }
})

const canRemoveUserFromGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const { groupId, userId } = args
  const currentUserId = user.id
  if (currentUserId === userId) {
    return false
  }
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (User {id: $currentUserId})-[currentUserMembership:MEMBER_OF]->(group:Group {id: $groupId})
        OPTIONAL MATCH (group)<-[userMembership:MEMBER_OF]-(user:User { id: $userId })
        RETURN currentUserMembership.role AS currentUserRole, userMembership.role AS userRole
      `,
      { currentUserId, groupId, userId },
    )
    return {
      currentUserRole: transactionResponse.records.map((record) =>
        record.get('currentUserRole'),
      )[0],
      userRole: transactionResponse.records.map((record) => record.get('userRole'))[0],
    }
  })
  try {
    const { currentUserRole, userRole } = await readTxPromise
    return (
      currentUserRole && ['owner'].includes(currentUserRole) && userRole && userRole !== 'owner'
    )
  } finally {
    await session.close()
  }
})

const canCommentPost = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }: Context) => {
  if (!user?.id) {
    return false
  }
  const { postId } = args
  const userId = user.id
  const session = driver.session()
  const readTxPromise = session.readTransaction(async (transaction) => {
    const transactionResponse = await transaction.run(
      `
        MATCH (post:Post { id: $postId })
        OPTIONAL MATCH (post)-[:IN]->(group:Group)
        OPTIONAL MATCH (user:User { id: $userId })-[membership:MEMBER_OF]->(group)
        RETURN group AS group, membership AS membership
      `,
      { postId, userId },
    )
    return {
      group: transactionResponse.records.map((record) => record.get('group'))[0],
      membership: transactionResponse.records.map((record) => record.get('membership'))[0],
    }
  })
  try {
    const { group, membership } = await readTxPromise
    return (
      !group || (membership && ['usual', 'admin', 'owner'].includes(membership.properties.role))
    )
  } finally {
    await session.close()
  }
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
  const roleName = (result.records[0]?.get('roleName') as string | undefined) ?? 'user'
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
  const targetPermissions = context.role.permissionsForRole(
    (row.get('roleName') as string | undefined) ?? 'user',
  )
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

const isAllowedToGenerateGroupInviteCode = rule({
  cache: 'no_cache',
})(async (_parent, args, context: Context) => {
  if (!context.user) {
    return false
  }

  return !!(
    await context.database.query({
      query: `
    MATCH (user:User{id: $user.id})-[membership:MEMBER_OF]->(group:Group {id: $args.groupId})
    WHERE (group.type IN ['closed','hidden'] AND membership.role IN ['admin', 'owner'])
      OR (NOT group.type IN ['closed','hidden'] AND NOT membership.role = 'pending')
    RETURN count(group) as count
    `,
      variables: { user: context.user, args },
    })
  ).records[0].get('count')
})

const isAllowedToPinGroupPost = rule({
  cache: 'no_cache',
})(async (_parent, args, context: Context) => {
  if (!context.user) {
    return false
  }

  return (
    (
      await context.database.query({
        query: `
    MATCH (post:Post{id: $args.id})-[:IN]->(group:Group)
    MATCH (user:User{id: $user.id})-[membership:MEMBER_OF]->(group)
    WHERE (membership.role IN ['admin', 'owner'])
    RETURN toString(count(group)) as count
    `,
        variables: { user: context.user, args },
      })
    ).records[0].get('count') === '1'
  )
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
      GroupMembers: and(groupsEnabled, isAllowedSeeingGroupMembers),
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
      videoCallParticipantCount: isAuthenticated,
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
      UpdateGroup: and(groupsEnabled, isAllowedToChangeGroupSettings),
      JoinGroup: and(groupsEnabled, isAllowedToJoinGroup),
      LeaveGroup: and(groupsEnabled, isAllowedToLeaveGroup),
      ChangeGroupMemberRole: and(groupsEnabled, isAllowedToChangeGroupMemberRole),
      RemoveUserFromGroup: and(groupsEnabled, canRemoveUserFromGroup),
      CreatePost: and(isAuthenticated, hasPermission('post.create'), isMemberOfGroup),
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
      CreateComment: and(isAuthenticated, hasPermission('comment.create'), canCommentPost),
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
      pinGroupPost: and(groupsEnabled, isAllowedToPinGroupPost),
      unpinGroupPost: and(groupsEnabled, isAllowedToPinGroupPost),
      pushPost: hasPermission('post.push'),
      unpushPost: hasPermission('post.push'),
      UpdateDonations: hasPermission('donation.manage'),

      // InviteCode
      generatePersonalInviteCode: and(isAuthenticated, hasPermission('user.invite')),
      generateGroupInviteCode: and(groupsEnabled, isAllowedToGenerateGroupInviteCode),
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
      CreateGroupRoom: and(groupsEnabled, isAuthenticated),
      CreateMessage: isAuthenticated,
      joinGroupVideoCall: and(groupsEnabled, isAuthenticated),
      MarkMessagesAsSeen: isAuthenticated,
      toggleObservePost: isAuthenticated,
      muteGroup: and(groupsEnabled, isAuthenticated, isMemberOfGroup),
      unmuteGroup: and(groupsEnabled, isAuthenticated, isMemberOfGroup),
      setGroupMembershipVisibility: and(groupsEnabled, isAuthenticated, isMemberOfGroup),
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
      '*': isAuthenticated, // TODO - only those who are allowed to see the group
      slug: allow,
      avatar: allow,
      name: allow,
      about: allow,
      groupType: allow,
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
