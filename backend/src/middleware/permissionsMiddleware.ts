/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { rule, shield, deny, allow, or, and } from 'graphql-shield'

import CONFIG from '@config/index'
import SocialMedia from '@db/models/SocialMedia'
import { getNeode } from '@db/neo4j'
// eslint-disable-next-line import/no-cycle
import { validateInviteCode } from '@graphql/resolvers/inviteCodes'
import { Context } from '@src/server'

const debug = !!CONFIG.DEBUG
const allowExternalErrors = true

const neode = getNeode()

const isAuthenticated = rule({
  cache: 'contextual',
})(async (_parent, _args, ctx, _info) => {
  return !!ctx?.user?.id
})

const isModerator = rule()(async (_parent, _args, { user }, _info) => {
  return user && (user.role === 'moderator' || user.role === 'admin')
})

const isAdmin = rule()(async (_parent, _args, { user }, _info) => {
  return user && user.role === 'admin'
})

const onlyYourself = rule({
  cache: 'no_cache',
})(async (_parent, args, context, _info) => {
  return context.user.id === args.id
})

const isMyOwn = rule({
  cache: 'no_cache',
})(async (parent, _args, { user }, _info) => {
  return user && user.id === parent.id
})

const isMyOwnInviteCode = rule({
  cache: 'no_cache',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
})(async (parent, _args, { user }, _info) => {
  // TODO
  return true
})

const isMySocialMedia = rule({
  cache: 'no_cache',
})(async (_, args, { user }) => {
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
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
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
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const isAllowedSeeingGroupMembers = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
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
    return (
      !!group &&
      (group.groupType === 'public' ||
        (['closed', 'hidden'].includes(group.groupType) &&
          !!member &&
          ['usual', 'admin', 'owner'].includes(member.myRoleInGroup)))
    )
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const isAllowedToChangeGroupMemberRole = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
  const currentUserId = user.id
  const { groupId, userId, roleInGroup } = args
  if (currentUserId === userId) return false
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
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const isAllowedToJoinGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
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
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const isAllowedToLeaveGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
  const { groupId, userId } = args
  if (user.id !== userId) return false
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
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const isMemberOfGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
  const { groupId } = args
  if (!groupId) return true
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
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const canRemoveUserFromGroup = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
  const { groupId, userId } = args
  const currentUserId = user.id
  if (currentUserId === userId) return false
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
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const canCommentPost = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user?.id) return false
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
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
})

const isAuthor = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!user) return false
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
    session.close()
  }
})

const isDeletingOwnAccount = rule({
  cache: 'no_cache',
})(async (_parent, args, context, _info) => {
  return context.user.id === args.id
})

const noEmailFilter = rule({
  cache: 'no_cache',
})(async (_, args) => {
  return !('email' in args)
})

const publicRegistration = rule()(() => CONFIG.PUBLIC_REGISTRATION)

const inviteRegistration = rule()(async (_parent, args, context: Context) => {
  if (!CONFIG.INVITE_REGISTRATION) return false
  const { inviteCode } = args
  return validateInviteCode(context, inviteCode)
})

const isAllowedToGenerateGroupInviteCode = rule({
  cache: 'no_cache',
})(async (_parent, args, context: Context) => {
  if (!context.user) return false

  return !!(
    await context.database.query({
      query: `
    MATCH (user:User{id: user.id})-[membership:MEMBER_OF]->(group:Group {id: $args.groupId})
    WHERE (group.type IN ['closed','hidden'] AND membership.role IN ['admin', 'owner'])
      OR (NOT group.type IN ['closed','hidden'] AND NOT membership.role = 'pending')
    RETURN count(group) as count
    `,
      variables: { user: context.user, args },
    })
  ).records[0].get('count')
})

// Permissions
export default shield(
  {
    Query: {
      '*': deny,
      searchResults: allow,
      searchPosts: allow,
      searchUsers: allow,
      searchGroups: allow,
      searchHashtags: allow,
      embed: allow,
      Category: allow,
      Tag: allow,
      reports: isModerator,
      statistics: allow,
      currentUser: isAuthenticated,
      Group: isAuthenticated,
      GroupMembers: isAllowedSeeingGroupMembers,
      GroupCount: isAuthenticated,
      Post: allow,
      profilePagePosts: allow,
      Comment: allow,
      User: and(isAuthenticated, or(noEmailFilter, isAdmin)),
      Badge: allow,
      PostsEmotionsCountByEmotion: allow,
      PostsEmotionsByCurrentUser: isAuthenticated,
      mutedUsers: isAuthenticated,
      blockedUsers: isAuthenticated,
      notifications: isAuthenticated,
      Donations: isAuthenticated,
      userData: isAuthenticated,
      VerifyNonce: allow,
      queryLocations: isAuthenticated,
      availableRoles: isAdmin,
      Room: isAuthenticated,
      Message: isAuthenticated,
      UnreadRooms: isAuthenticated,

      // Invite Code
      validateInviteCode: allow,
    },
    Mutation: {
      '*': deny,
      login: allow,
      Signup: or(publicRegistration, inviteRegistration, isAdmin),
      SignupVerification: allow,
      UpdateUser: onlyYourself,
      CreateGroup: isAuthenticated,
      UpdateGroup: isAllowedToChangeGroupSettings,
      JoinGroup: isAllowedToJoinGroup,
      LeaveGroup: isAllowedToLeaveGroup,
      ChangeGroupMemberRole: isAllowedToChangeGroupMemberRole,
      RemoveUserFromGroup: canRemoveUserFromGroup,
      CreatePost: and(isAuthenticated, isMemberOfGroup),
      UpdatePost: isAuthor,
      DeletePost: isAuthor,
      fileReport: isAuthenticated,
      CreateSocialMedia: isAuthenticated,
      UpdateSocialMedia: isMySocialMedia,
      DeleteSocialMedia: isMySocialMedia,
      setVerificationBadge: isAdmin,
      rewardTrophyBadge: isAdmin,
      revokeBadge: isAdmin,
      followUser: isAuthenticated,
      unfollowUser: isAuthenticated,
      shout: isAuthenticated,
      unshout: isAuthenticated,
      changePassword: isAuthenticated,
      review: isModerator,
      CreateComment: and(isAuthenticated, canCommentPost),
      UpdateComment: isAuthor,
      DeleteComment: isAuthor,
      DeleteUser: or(isDeletingOwnAccount, isAdmin),
      requestPasswordReset: allow,
      resetPassword: allow,
      AddPostEmotions: isAuthenticated,
      RemovePostEmotions: isAuthenticated,
      muteUser: isAuthenticated,
      unmuteUser: isAuthenticated,
      blockUser: isAuthenticated,
      unblockUser: isAuthenticated,
      markAsRead: isAuthenticated,
      markAllAsRead: isAuthenticated,
      AddEmailAddress: isAuthenticated,
      VerifyEmailAddress: isAuthenticated,
      pinPost: isAdmin,
      unpinPost: isAdmin,
      UpdateDonations: isAdmin,

      // InviteCode
      generatePersonalInviteCode: isAuthenticated,
      generateGroupInviteCode: isAllowedToGenerateGroupInviteCode,
      invalidateInviteCode: isAuthenticated,
      redeemInviteCode: isAuthenticated,

      switchUserRole: isAdmin,
      markTeaserAsViewed: allow,
      saveCategorySettings: isAuthenticated,
      updateOnlineStatus: isAuthenticated,
      CreateRoom: isAuthenticated,
      CreateMessage: isAuthenticated,
      MarkMessagesAsSeen: isAuthenticated,
      toggleObservePost: isAuthenticated,
      muteGroup: and(isAuthenticated, isMemberOfGroup),
      unmuteGroup: and(isAuthenticated, isMemberOfGroup),
      setTrophyBadgeSelected: isAuthenticated,
      resetTrophyBadgesSelected: isAuthenticated,
    },
    User: {
      '*': isAuthenticated,
      name: allow,
      avatar: allow,
      email: or(isMyOwn, isAdmin),
      emailNotificationSettings: isMyOwn,
      inviteCodes: isMyOwn,
    },
    Group: {
      '*': isAuthenticated, // TODO - is allowed to see group
      inviteCodes: isMyOwnInviteCode,
      avatar: allow,
      name: allow,
      about: allow,
      groupType: allow,
    },
    InviteCode: {
      redeemedBy: isMyOwnInviteCode,
      createdAt: isMyOwnInviteCode,
      expiresAt: isMyOwnInviteCode,
    },
    Location: {
      distanceToMe: isAuthenticated,
    },
    Report: isModerator,
  },
  {
    debug,
    allowExternalErrors,
    fallbackRule: allow,
    fallbackError: Error('Not Authorized!'),
  },
)
