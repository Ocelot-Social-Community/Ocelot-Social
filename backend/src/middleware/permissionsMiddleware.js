import { rule, shield, deny, allow, or, and } from 'graphql-shield'
import { getNeode } from '../db/neo4j'
import CONFIG from '../config'
import { validateInviteCode } from '../schema/resolvers/transactions/inviteCodes'

const debug = !!CONFIG.DEBUG
const allowExternalErrors = true

const neode = getNeode()

const isAuthenticated = rule({
  cache: 'contextual',
})(async (_parent, _args, ctx, _info) => {
  return !!(ctx && ctx.user && ctx.user.id)
})

const isModerator = rule()(async (parent, args, { user }, info) => {
  return user && (user.role === 'moderator' || user.role === 'admin')
})

const isAdmin = rule()(async (parent, args, { user }, info) => {
  return user && user.role === 'admin'
})

const onlyYourself = rule({
  cache: 'no_cache',
})(async (parent, args, context, info) => {
  return context.user.id === args.id
})

const isMyOwn = rule({
  cache: 'no_cache',
})(async (parent, args, { user }, info) => {
  return user && user.id === parent.id
})

const isMySocialMedia = rule({
  cache: 'no_cache',
})(async (_, args, { user }) => {
  // We need a User
  if (!user) {
    return false
  }
  let socialMedia = await neode.find('SocialMedia', args.id)
  // Did we find a social media node?
  if (!socialMedia) {
    return false
  }
  socialMedia = await socialMedia.toJson() // whats this for?

  // Is it my social media entry?
  return socialMedia.ownedBy.node.id === user.id
})

const isAllowedToChangeGroupSettings = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!(user && user.id)) return false
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
  if (!(user && user.id)) return false
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
  if (!(user && user.id)) return false
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
  if (!(user && user.id)) return false
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
  if (!(user && user.id)) return false
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
  if (!(user && user.id)) return false
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
  if (!(user && user.id)) return false
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
      currentUserRole: transactionResponse.records.map((record) => record.get('currentUserRole'))[0],
      userRole: transactionResponse.records.map((record) => record.get('userRole'))[0],
    }
  })
  try {
    const { currentUserRole, userRole } = await readTxPromise
    return currentUserRole && ['admin', 'owner'].includes(currentUserRole)
      && userRole && userRole !== 'owner'
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }  
})

const canCommentPost = rule({
  cache: 'no_cache',
})(async (_parent, args, { user, driver }) => {
  if (!(user && user.id)) return false
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
})(async (parent, args, context, _info) => {
  return context.user.id === args.id
})

const noEmailFilter = rule({
  cache: 'no_cache',
})(async (_, args) => {
  return !('email' in args)
})

const publicRegistration = rule()(() => CONFIG.PUBLIC_REGISTRATION)

const inviteRegistration = rule()(async (_parent, args, { user, driver }) => {
  if (!CONFIG.INVITE_REGISTRATION) return false
  const { inviteCode } = args
  const session = driver.session()
  return validateInviteCode(session, inviteCode)
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
      currentUser: allow,
      Group: isAuthenticated,
      GroupMembers: isAllowedSeeingGroupMembers,
      GroupCount: isAuthenticated,
      Post: allow,
      profilePagePosts: allow,
      Comment: allow,
      User: or(noEmailFilter, isAdmin),
      isLoggedIn: allow,
      Badge: allow,
      PostsEmotionsCountByEmotion: allow,
      PostsEmotionsByCurrentUser: isAuthenticated,
      mutedUsers: isAuthenticated,
      blockedUsers: isAuthenticated,
      notifications: isAuthenticated,
      Donations: isAuthenticated,
      userData: isAuthenticated,
      MyInviteCodes: isAuthenticated,
      isValidInviteCode: allow,
      VerifyNonce: allow,
      queryLocations: isAuthenticated,
      availableRoles: isAdmin,
      getInviteCode: isAuthenticated, // and inviteRegistration
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
      // AddBadgeRewarded: isAdmin,
      // RemoveBadgeRewarded: isAdmin,
      reward: isAdmin,
      unreward: isAdmin,
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
      AddEmailAddress: isAuthenticated,
      VerifyEmailAddress: isAuthenticated,
      pinPost: isAdmin,
      unpinPost: isAdmin,
      UpdateDonations: isAdmin,
      GenerateInviteCode: isAuthenticated,
      switchUserRole: isAdmin,
      markTeaserAsViewed: allow,
      saveCategorySettings: isAuthenticated,
    },
    User: {
      email: or(isMyOwn, isAdmin),
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
