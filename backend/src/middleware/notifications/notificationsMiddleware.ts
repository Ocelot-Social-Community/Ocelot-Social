/* eslint-disable security/detect-object-injection */
import { sendMail } from '@middleware/helpers/email/sendMail'
import {
  chatMessageTemplate,
  notificationTemplate,
} from '@middleware/helpers/email/templateBuilder'
import { isUserOnline } from '@middleware/helpers/isUserOnline'
import { validateNotifyUsers } from '@middleware/validation/validationMiddleware'
// eslint-disable-next-line import/no-cycle
import { pubsub, NOTIFICATION_ADDED } from '@src/server'

import extractMentionedUsers from './mentions/extractMentionedUsers'

const queryNotificationEmails = async (context, notificationUserIds) => {
  if (!(notificationUserIds && notificationUserIds.length)) return []
  const userEmailCypher = `
    MATCH (user: User)
    // blocked users are filtered out from notifications already
    WHERE user.id in $notificationUserIds
    WITH user
    MATCH (user)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
    RETURN emailAddress {.email}
  `
  const session = context.driver.session()
  const writeTxResultPromise = session.readTransaction(async (transaction) => {
    const emailAddressTransactionResponse = await transaction.run(userEmailCypher, {
      notificationUserIds,
    })
    return emailAddressTransactionResponse.records.map((record) => record.get('emailAddress'))
  })
  try {
    const emailAddresses = await writeTxResultPromise
    return emailAddresses
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

const publishNotifications = async (context, promises, emailNotificationSetting: string) => {
  let notifications = await Promise.all(promises)
  notifications = notifications.flat()
  const notificationsEmailAddresses = await queryNotificationEmails(
    context,
    notifications.map((notification) => notification.to.id),
  )
  notifications.forEach((notificationAdded, index) => {
    pubsub.publish(NOTIFICATION_ADDED, { notificationAdded })
    if (notificationAdded.to[emailNotificationSetting] ?? true) {
      sendMail(
        notificationTemplate({
          email: notificationsEmailAddresses[index].email,
          variables: { notification: notificationAdded },
        }),
      )
    }
  })
}

const handleJoinGroup = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      [notifyOwnersOfGroup(groupId, userId, 'user_joined_group', context)],
      'emailNotificationsGroupMemberJoined',
    )
  }
  return user
}

const handleLeaveGroup = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      [notifyOwnersOfGroup(groupId, userId, 'user_left_group', context)],
      'emailNotificationsGroupMemberLeft',
    )
  }
  return user
}

const handleChangeGroupMemberRole = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      [notifyMemberOfGroup(groupId, userId, 'changed_group_member_role', context)],
      'emailNotificationsGroupMemberRoleChanged',
    )
  }
  return user
}

const handleRemoveUserFromGroup = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      [notifyMemberOfGroup(groupId, userId, 'removed_user_from_group', context)],
      'emailNotificationsGroupMemberRemoved',
    )
  }
  return user
}

const handleContentDataOfPost = async (resolve, root, args, context, resolveInfo) => {
  const { groupId } = args
  const idsOfUsers = extractMentionedUsers(args.content)
  const post = await resolve(root, args, context, resolveInfo)
  if (post) {
    await publishNotifications(
      context,
      [notifyUsersOfMention('Post', post.id, idsOfUsers, 'mentioned_in_post', context)],
      'emailNotificationsMention',
    )
    await publishNotifications(
      context,
      [notifyFollowingUsers(post.id, groupId, context)],
      'emailNotificationsFollowingUsers',
    )
    await publishNotifications(
      context,
      [notifyGroupMembersOfNewPost(post.id, groupId, context)],
      'emailNotificationsPostInGroup',
    )
  }
  return post
}

const handleContentDataOfComment = async (resolve, root, args, context, resolveInfo) => {
  const { content } = args
  let idsOfMentionedUsers = extractMentionedUsers(content)
  const comment = await resolve(root, args, context, resolveInfo)
  const [postAuthor] = await postAuthorOfComment(comment.id, { context })
  idsOfMentionedUsers = idsOfMentionedUsers.filter((id) => id !== postAuthor.id)
  await publishNotifications(
    context,
    [
      notifyUsersOfMention(
        'Comment',
        comment.id,
        idsOfMentionedUsers,
        'mentioned_in_comment',
        context,
      ),
    ],
    'emailNotificationsMention',
  )

  await publishNotifications(
    context,
    [notifyUsersOfComment('Comment', comment.id, 'commented_on_post', context)],
    'emailNotificationsCommentOnObservedPost',
  )

  return comment
}

const postAuthorOfComment = async (commentId, { context }) => {
  const session = context.driver.session()
  let postAuthorId
  try {
    postAuthorId = await session.readTransaction((transaction) => {
      return transaction.run(
        `
          MATCH (author:User)-[:WROTE]->(:Post)<-[:COMMENTS]-(:Comment { id: $commentId })
          RETURN author { .id } as authorId
        `,
        { commentId },
      )
    })
    return postAuthorId.records.map((record) => record.get('authorId'))
  } finally {
    session.close()
  }
}

const notifyFollowingUsers = async (postId, groupId, context) => {
  const reason = 'followed_user_posted'
  const cypher = `
    MATCH (post:Post { id: $postId })<-[:WROTE]-(author:User { id: $userId })<-[:FOLLOWS]-(user:User)
    OPTIONAL MATCH (post)-[:IN]->(group:Group { id: $groupId })
    WITH post, author, user, group WHERE group IS NULL OR group.groupType = 'public'
    MERGE (post)-[notification:NOTIFIED {reason: $reason}]->(user)
      SET notification.read = FALSE
      SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
      SET notification.updatedAt = toString(datetime())
    WITH notification, author, user,
      post {.*, author: properties(author) } AS finalResource
    RETURN notification {
      .*,
      from: finalResource,
      to: properties(user),
      relatedUser: properties(author)
    }
  `
  const session = context.driver.session()
  const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    const notificationTransactionResponse = await transaction.run(cypher, {
      postId,
      reason,
      groupId: groupId || null,
      userId: context.user.id,
    })
    return notificationTransactionResponse.records.map((record) => record.get('notification'))
  })
  try {
    const notifications = await writeTxResultPromise
    return notifications
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

const notifyGorupMembersOfNewPost = async (postId, groupId, context) => {
  if (!groupId) return []
  const reason = 'post_in_group'
  const cypher = `
    MATCH (post:Post { id: $postId })<-[:WROTE]-(author:User { id: $userId })
    MATCH (post)-[:IN]->(group:Group { id: $groupId })<-[membership:MEMBER_OF]-(user:User)
      WHERE NOT membership.role = 'pending'
      AND NOT (user)-[:MUTED]->(group)
      AND NOT user.id = $userId
    WITH post, author, user
    MERGE (post)-[notification:NOTIFIED {reason: $reason}]->(user)
      SET notification.read = FALSE
      SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
      SET notification.updatedAt = toString(datetime())
    WITH notification, author, user,
      post {.*, author: properties(author) } AS finalResource
    RETURN notification {
      .*,
      from: finalResource,
      to: properties(user),
      relatedUser: properties(author)
    }
  `
  const session = context.driver.session()
  const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    const notificationTransactionResponse = await transaction.run(cypher, {
      postId,
      reason,
      groupId,
      userId: context.user.id,
    })
    return notificationTransactionResponse.records.map((record) => record.get('notification'))
  })
  try {
    const notifications = await writeTxResultPromise
    return notifications
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

const notifyOwnersOfGroup = async (groupId, userId, reason, context) => {
  const cypher = `
    MATCH (user:User { id: $userId })
    MATCH (group:Group { id: $groupId })<-[membership:MEMBER_OF]-(owner:User)
    WHERE membership.role = 'owner'
    WITH owner, group, user, membership
    MERGE (group)-[notification:NOTIFIED {reason: $reason}]->(owner)
    WITH group, owner, notification, user, membership
    SET notification.read = FALSE
    SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
    SET notification.updatedAt = toString(datetime())
    SET notification.relatedUserId = $userId
    WITH owner, group { __typename: 'Group', .*, myRole: membership.roleInGroup } AS finalGroup, user, notification
    RETURN notification {.*, from: finalGroup, to: properties(owner), relatedUser: properties(user) }
  `
  const session = context.driver.session()
  const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    const notificationTransactionResponse = await transaction.run(cypher, {
      groupId,
      reason,
      userId,
    })
    return notificationTransactionResponse.records.map((record) => record.get('notification'))
  })
  try {
    const notifications = await writeTxResultPromise
    return notifications
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

const notifyMemberOfGroup = async (groupId, userId, reason, context) => {
  const { user: owner } = context
  const cypher = `
    MATCH (owner:User { id: $ownerId })
    MATCH (user:User { id: $userId })
    MATCH (group:Group { id: $groupId })
    OPTIONAL MATCH (user)-[membership:MEMBER_OF]->(group)
    WITH user, group, owner, membership
    MERGE (group)-[notification:NOTIFIED {reason: $reason}]->(user)
    WITH group, user, notification, owner, membership
    SET notification.read = FALSE
    SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
    SET notification.updatedAt = toString(datetime())
    SET notification.relatedUserId = $ownerId
    WITH group { __typename: 'Group', .*, myRole: membership.roleInGroup } AS finalGroup,
    notification, user, owner
    RETURN notification {.*, from: finalGroup, to: properties(user), relatedUser: properties(owner) }
  `
  const session = context.driver.session()
  const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    const notificationTransactionResponse = await transaction.run(cypher, {
      groupId,
      reason,
      userId,
      ownerId: owner.id,
    })
    return notificationTransactionResponse.records.map((record) => record.get('notification'))
  })
  try {
    const notifications = await writeTxResultPromise
    return notifications
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

const notifyUsersOfMention = async (label, id, idsOfUsers, reason, context) => {
  if (!(idsOfUsers && idsOfUsers.length)) return []
  await validateNotifyUsers(label, reason)
  let mentionedCypher
  switch (reason) {
    case 'mentioned_in_post': {
      mentionedCypher = `
        MATCH (post: Post { id: $id })<-[:WROTE]-(author: User)
        MATCH (user: User)
        WHERE user.id in $idsOfUsers
        AND NOT (user)-[:BLOCKED]-(author)
        MERGE (post)-[notification:NOTIFIED {reason: $reason}]->(user)
        WITH post AS resource, notification, user
      `
      break
    }
    case 'mentioned_in_comment': {
      mentionedCypher = `
      MATCH (postAuthor: User)-[:WROTE]->(post: Post)<-[:COMMENTS]-(comment: Comment { id: $id })<-[:WROTE]-(commenter: User)
      MATCH (user: User)
      WHERE user.id in $idsOfUsers
      AND NOT (user)-[:BLOCKED]-(commenter)
      AND NOT (user)-[:BLOCKED]-(postAuthor)
      MERGE (comment)-[notification:NOTIFIED {reason: $reason}]->(user)
      WITH comment AS resource, notification, user
      `
      break
    }
  }
  mentionedCypher += `
    WITH notification, user, resource,
    [(resource)<-[:WROTE]-(author:User) | author {.*}] AS authors,
    [(resource)-[:COMMENTS]->(post:Post)<-[:WROTE]-(author:User) | post{.*, author: properties(author)} ] AS posts
    WITH resource, user, notification, authors, posts,
    resource {.*, __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'Group']][0], author: authors[0], post: posts[0]} AS finalResource
    SET notification.read = FALSE
    SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
    SET notification.updatedAt = toString(datetime())
    RETURN notification {.*, from: finalResource, to: properties(user), relatedUser: properties(user) }
  `
  const session = context.driver.session()
  const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    const notificationTransactionResponse = await transaction.run(mentionedCypher, {
      id,
      idsOfUsers,
      reason,
    })
    return notificationTransactionResponse.records.map((record) => record.get('notification'))
  })
  try {
    const notifications = await writeTxResultPromise
    return notifications
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

const notifyUsersOfComment = async (label, commentId, reason, context) => {
  await validateNotifyUsers(label, reason)
  const session = context.driver.session()
  const writeTxResultPromise = await session.writeTransaction(async (transaction) => {
    const notificationTransactionResponse = await transaction.run(
      `
      MATCH (observingUser:User)-[:OBSERVES { active: true }]->(post:Post)<-[:COMMENTS]-(comment:Comment { id: $commentId })<-[:WROTE]-(commenter:User)
      WHERE NOT (observingUser)-[:BLOCKED]-(commenter) AND NOT observingUser.id = $userId
      WITH observingUser, post, comment, commenter
      MATCH (postAuthor:User)-[:WROTE]->(post)
      MERGE (comment)-[notification:NOTIFIED {reason: $reason}]->(observingUser)
      SET notification.read = FALSE
      SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
      SET notification.updatedAt = toString(datetime())
      WITH notification, observingUser, post, commenter, postAuthor,
      comment {.*, __typename: labels(comment)[0], author: properties(commenter), post:  post {.*, author: properties(postAuthor) } } AS finalResource
      RETURN notification {
        .*,
        from: finalResource,
        to: properties(observingUser),
        relatedUser: properties(commenter)
      }
    `,
      {
        commentId,
        reason,
        userId: context.user.id,
      },
    )
    return notificationTransactionResponse.records.map((record) => record.get('notification'))
  })
  try {
    const notifications = await writeTxResultPromise
    return notifications
  } finally {
    session.close()
  }
}

const handleCreateMessage = async (resolve, root, args, context, resolveInfo) => {
  // Execute resolver
  const result = await resolve(root, args, context, resolveInfo)

  // Query Parameters
  const { roomId } = args
  const {
    user: { id: currentUserId },
  } = context

  // Find Recipient
  const session = context.driver.session()
  const messageRecipient = session.readTransaction(async (transaction) => {
    const messageRecipientCypher = `
      MATCH (senderUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })
      MATCH (room)<-[:CHATS_IN]-(recipientUser:User)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
        WHERE NOT recipientUser.id = $currentUserId
        AND NOT (recipientUser)-[:BLOCKED]-(senderUser)
        AND NOT recipientUser.emailNotificationsChatMessage = false
      RETURN senderUser {.*}, recipientUser {.*}, emailAddress {.email}
    `
    const txResponse = await transaction.run(messageRecipientCypher, {
      currentUserId,
      roomId,
    })

    return {
      senderUser: await txResponse.records.map((record) => record.get('senderUser'))[0],
      recipientUser: await txResponse.records.map((record) => record.get('recipientUser'))[0],
      email: await txResponse.records.map((record) => record.get('emailAddress'))[0]?.email,
    }
  })

  try {
    // Execute Query
    const { senderUser, recipientUser, email } = await messageRecipient

    // Send EMail if we found a user(not blocked) and he is not considered online
    if (recipientUser && !isUserOnline(recipientUser)) {
      void sendMail(chatMessageTemplate({ email, variables: { senderUser, recipientUser } }))
    }

    // Return resolver result to client
    return result
  } catch (error) {
    throw new Error(error)
  } finally {
    session.close()
  }
}

export default {
  Mutation: {
    CreatePost: handleContentDataOfPost,
    UpdatePost: handleContentDataOfPost,
    CreateComment: handleContentDataOfComment,
    UpdateComment: handleContentDataOfComment,
    JoinGroup: handleJoinGroup,
    LeaveGroup: handleLeaveGroup,
    ChangeGroupMemberRole: handleChangeGroupMemberRole,
    RemoveUserFromGroup: handleRemoveUserFromGroup,
    CreateMessage: handleCreateMessage,
  },
}
