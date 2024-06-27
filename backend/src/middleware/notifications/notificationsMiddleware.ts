import { pubsub, NOTIFICATION_ADDED } from '../../server'
import { AuthenticationError } from 'apollo-server'
import { queryAllUserIds, extractMentionedUsers } from './mentions/extractMentionedUsers'
import { validateNotifyUsers } from '../validation/validationMiddleware'
import { sendMail } from '../helpers/email/sendMail'
import { notificationTemplate } from '../helpers/email/templateBuilder'

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

const publishNotifications = async (context, promises) => {
  let notifications = await Promise.all(promises)
  notifications = notifications.flat()
  const notificationsEmailAddresses = await queryNotificationEmails(
    context,
    notifications.map((notification) => notification.to.id),
  )
  notifications.forEach((notificationAdded, index) => {
    pubsub.publish(NOTIFICATION_ADDED, { notificationAdded })
    if (notificationAdded.to.sendNotificationEmails) {
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
    await publishNotifications(context, [
      notifyOwnersOfGroup(groupId, userId, 'user_joined_group', context),
    ])
  }
  return user
}

const handleLeaveGroup = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(context, [
      notifyOwnersOfGroup(groupId, userId, 'user_left_group', context),
    ])
  }
  return user
}

const handleChangeGroupMemberRole = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(context, [
      notifyMemberOfGroup(groupId, userId, 'changed_group_member_role', context),
    ])
  }
  return user
}

const handleRemoveUserFromGroup = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(context, [
      notifyMemberOfGroup(groupId, userId, 'removed_user_from_group', context),
    ])
  }
  return user
}

const handleContentDataOfPost = async (resolve, root, args, context, resolveInfo) => {
  const idsOfUsers = extractMentionedUsers(args.content)
  const post = await resolve(root, args, context, resolveInfo)
  if (post) {
    if (idsOfUsers.find((id) => id === 'all')) {
      if (context.user.role !== 'admin') {
        throw new AuthenticationError('You are not allowed to use the "@all" mention!')
      }
      let userToNotify = await queryAllUserIds(context)
      userToNotify = userToNotify.filter((id) => id !== context.user.id)
      await publishNotifications(context, [
        notifyUsersOfMention('Post', post.id, userToNotify, 'mentioned_in_post', context),
      ])
    } else {
      await publishNotifications(context, [
        notifyUsersOfMention('Post', post.id, idsOfUsers, 'mentioned_in_post', context),
      ])
    }
  }
  return post
}

const handleContentDataOfComment = async (resolve, root, args, context, resolveInfo) => {
  const { content } = args
  const comment = await resolve(root, args, context, resolveInfo)
  const [postAuthor] = await postAuthorOfComment(comment.id, { context })
  const mentionedUserIds = extractMentionedUsers(content).filter((id) => id !== postAuthor.id)

  let notifications
  if (mentionedUserIds.includes('all')) {
    if (context.user.role !== 'admin') {
      throw new AuthenticationError('You are not allowed to use the "@all" mention!')
    }
    const userToNotify = (await queryAllUserIds(context)).filter((id) => id !== postAuthor.id)
    const notification = notifyUsersOfMention(
      'Comment',
      comment.id,
      userToNotify,
      'mentioned_in_comment',
      context,
    )
    notifications = [notification]
  } else {
    notifications = [
      notifyUsersOfMention(
        'Comment',
        comment.id,
        mentionedUserIds,
        'mentioned_in_comment',
        context,
      ),
      notifyUsersOfComment('Comment', comment.id, postAuthor.id, 'commented_on_post', context),
    ]
  }
  await publishNotifications(context, notifications)
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

const notifyUsersOfComment = async (label, commentId, postAuthorId, reason, context) => {
  if (context.user.id === postAuthorId) return []
  await validateNotifyUsers(label, reason)
  const session = context.driver.session()
  const writeTxResultPromise = await session.writeTransaction(async (transaction) => {
    const notificationTransactionResponse = await transaction.run(
      `
      MATCH (postAuthor:User {id: $postAuthorId})-[:WROTE]->(post:Post)<-[:COMMENTS]-(comment:Comment { id: $commentId })<-[:WROTE]-(commenter:User)
      WHERE NOT (postAuthor)-[:BLOCKED]-(commenter)
      MERGE (comment)-[notification:NOTIFIED {reason: $reason}]->(postAuthor)
      SET notification.read = FALSE
      SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
      SET notification.updatedAt = toString(datetime())
      WITH notification, postAuthor, post, commenter,
      comment {.*, __typename: labels(comment)[0], author: properties(commenter), post:  post {.*, author: properties(postAuthor) } } AS finalResource
      RETURN notification {
        .*,
        from: finalResource,
        to: properties(postAuthor),
        relatedUser: properties(commenter)
      }
    `,
      { commentId, postAuthorId, reason },
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
  },
}
