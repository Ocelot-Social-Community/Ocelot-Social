/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { NOTIFICATION_ADDED, ROOM_UPDATED, CHAT_MESSAGE_ADDED } from '@constants/subscriptions'
import { getRoomProperties } from '@graphql/resolvers/rooms'
import { isUserOnline } from '@middleware/helpers/isUserOnline'
import { validateNotifyUsers } from '@middleware/validation/validationMiddleware'
import { sendNotificationMail, sendChatMessageMail } from '@src/emails/sendEmail'

import extractMentionedUsers from './mentions/extractMentionedUsers'

import type { IMiddlewareResolver } from 'graphql-middleware/types'

const publishNotifications = async (
  context,
  notificationsPromise,
  emailNotificationSetting: string,
  emailsSent: string[] = [],
): Promise<string[]> => {
  const notifications = await notificationsPromise
  notifications.forEach((notificationAdded) => {
    context.pubsub.publish(NOTIFICATION_ADDED, { notificationAdded })
    if (
      notificationAdded.email && // no primary email was found
      (notificationAdded.to[emailNotificationSetting] ?? true) &&
      !isUserOnline(notificationAdded.to) &&
      !emailsSent.includes(notificationAdded.email)
    ) {
      void sendNotificationMail(notificationAdded)
      emailsSent.push(notificationAdded.email)
    }
  })
  return emailsSent
}

const handleJoinGroup: IMiddlewareResolver = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      notifyOwnersOfGroup(groupId, userId, 'user_joined_group', context),
      'emailNotificationsGroupMemberJoined',
    )
  }
  return user
}

const handleLeaveGroup: IMiddlewareResolver = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      notifyOwnersOfGroup(groupId, userId, 'user_left_group', context),
      'emailNotificationsGroupMemberLeft',
    )
  }
  return user
}

const handleChangeGroupMemberRole: IMiddlewareResolver = async (
  resolve,
  root,
  args,
  context,
  resolveInfo,
) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      notifyMemberOfGroup(groupId, userId, 'changed_group_member_role', context),
      'emailNotificationsGroupMemberRoleChanged',
    )
  }
  return user
}

const handleRemoveUserFromGroup: IMiddlewareResolver = async (
  resolve,
  root,
  args,
  context,
  resolveInfo,
) => {
  const { groupId, userId } = args
  const user = await resolve(root, args, context, resolveInfo)
  if (user) {
    await publishNotifications(
      context,
      notifyMemberOfGroup(groupId, userId, 'removed_user_from_group', context),
      'emailNotificationsGroupMemberRemoved',
    )
  }
  return user
}

/**
 * Everyone the post MENTIONS, for both creating and editing.
 *
 * Shared because an @-mention added while editing has to arrive — that is the one notification
 * an edit legitimately produces. Nothing else about an edit is news.
 *
 * `args.content` is read before `resolve` on purpose: the mutation runs the content through
 * sanitising middleware, and the mentions have to be taken from what the author wrote.
 */
const notifyMentionedInPost = async (postId, content, context): Promise<string[]> =>
  publishNotifications(
    context,
    notifyUsersOfMention(
      'Post',
      postId,
      extractMentionedUsers(content),
      'mentioned_in_post',
      context,
    ),
    'emailNotificationsMention',
  )

const handleCreatePost: IMiddlewareResolver = async (resolve, root, args, context, resolveInfo) => {
  const { groupId, content } = args
  const post = await resolve(root, args, context, resolveInfo)
  if (post) {
    // `publishNotifications` PUSHES into the array it is handed and returns that same array, so
    // passing it along is what keeps a follower who is also mentioned from getting two mails
    // about one post. The previous spelling wrapped the second call in `sentEmails.concat(…)`
    // and dropped the result — dead code that read as if it were doing the accumulating.
    const sentEmails: string[] = await notifyMentionedInPost(post.id, content, context)
    await publishNotifications(
      context,
      notifyFollowingUsers(post.id, context),
      'emailNotificationsFollowingUsers',
      sentEmails,
    )
    await publishNotifications(
      context,
      notifyGroupMembersOfNewPost(post.id, groupId, context),
      'emailNotificationsPostInGroup',
      sentEmails,
    )
  }
  return post
}

/**
 * An edit is not a new post.
 *
 * Both mutations used to share one handler, which announced every edit to the author's
 * followers and to the group as if the post had just appeared. Two things were wrong with it.
 *
 * The leak: the group filter took its group from `args.groupId`, an argument only CreatePost
 * declares (see Post.gql). On an edit it arrived as `undefined`, matched no group, and the
 * filter fell open — every follower of the author was notified about a post inside a hidden
 * group, naming its title and author to people who cannot open it. That half is fixed in
 * `notifyFollowingUsers`, which now asks the graph instead of trusting an argument.
 *
 * The resurrection: the MERGE sets `read = FALSE` on an EXISTING edge, so a correcting a typo
 * pushed a long-read notification back to the top of everyone's bell.
 *
 * Mentions stay, for the reason given above them.
 */
const handleUpdatePost: IMiddlewareResolver = async (resolve, root, args, context, resolveInfo) => {
  const content = args.content
  const post = await resolve(root, args, context, resolveInfo)
  if (post) {
    await notifyMentionedInPost(post.id, content, context)
  }
  return post
}

const handleContentDataOfComment: IMiddlewareResolver = async (
  resolve,
  root,
  args,
  context,
  resolveInfo,
) => {
  const { content } = args
  let idsOfMentionedUsers = extractMentionedUsers(content)
  const comment = await resolve(root, args, context, resolveInfo)
  const [postAuthor] = await postAuthorOfComment(comment.id, { context })
  idsOfMentionedUsers = idsOfMentionedUsers.filter((id) => id !== postAuthor.id)
  const sentEmails: string[] = await publishNotifications(
    context,
    notifyUsersOfMention(
      'Comment',
      comment.id,
      idsOfMentionedUsers,
      'mentioned_in_comment',
      context,
    ),
    'emailNotificationsMention',
  )
  await publishNotifications(
    context,
    notifyUsersOfComment('Comment', comment.id, 'commented_on_post', context),
    'emailNotificationsCommentOnObservedPost',
    sentEmails,
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
    await session.close()
  }
}

/**
 * Announce a new post to the author's followers — unless it lives in a non-public group.
 *
 * The group comes from the GRAPH, not from a mutation argument. It used to be passed in as
 * `groupId` and matched with `(post)-[:IN]->(group:Group { id: $groupId })`, which made the
 * filter fail OPEN in the one case it exists for: `groupId` is declared on CreatePost only, so
 * on UpdatePost it arrived as `null`, the OPTIONAL MATCH bound nothing, `group IS NULL` was
 * true, and every follower learned the title and author of a post inside a hidden group. An
 * access rule cannot depend on the caller remembering to pass its subject.
 *
 * Spelled as "no non-public group", not "the group is public": a post reached through several
 * `:IN` edges produced one row per group, and any public one among them let the whole post
 * through. This is also the rule `postFilter.ts` applies to an anonymous visitor (`invisibleTo`),
 * in the same words — the timeline and the notification now agree on what is announceable.
 */
const notifyFollowingUsers = async (postId, context) => {
  const reason = 'followed_user_posted'
  const cypher = `
    MATCH (post:Post { id: $postId })<-[:WROTE]-(author:User { id: $userId })<-[:FOLLOWS]-(user:User)
    OPTIONAL MATCH (user)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
    WITH post, author, user, emailAddress
    WHERE NOT EXISTS {
      MATCH (post)-[:IN]->(group:Group)
      WHERE NOT group.groupType = 'public'
    }
    MERGE (post)-[notification:NOTIFIED {reason: $reason}]->(user)
      SET notification.read = FALSE
      SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
      SET notification.updatedAt = toString(datetime())
    WITH notification, author, user, emailAddress.email as email,
      post {.*, author: properties(author) } AS finalResource
    RETURN notification {
      .*,
      from: finalResource,
      to: properties(user),
      email: email,
      relatedUser: properties(author)
    }
  `
  const session = context.driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      const notificationTransactionResponse = await transaction.run(cypher, {
        postId,
        reason,
        userId: context.user.id,
      })
      return notificationTransactionResponse.records.map((record) => record.get('notification'))
    })
  } finally {
    await session.close()
  }
}

const notifyGroupMembersOfNewPost = async (postId, groupId, context) => {
  if (!groupId) {
    return []
  }
  const reason = 'post_in_group'
  const cypher = `
    MATCH (post:Post { id: $postId })<-[:WROTE]-(author:User { id: $userId })
    OPTIONAL MATCH (user)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
    MATCH (post)-[:IN]->(group:Group { id: $groupId })<-[membership:MEMBER_OF]-(user:User)
      WHERE NOT membership.role = 'pending'
      AND NOT (user)-[:MUTED]->(group)
      AND NOT (user)-[:MUTED]->(author)
      AND NOT (user)-[:BLOCKED]-(author)
      AND NOT user.id = $userId
    WITH post, author, user, emailAddress
    MERGE (post)-[notification:NOTIFIED {reason: $reason}]->(user)
      SET notification.read = FALSE
      SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
      SET notification.updatedAt = toString(datetime())
    WITH notification, author, user, emailAddress.email as email,
      post {.*, author: properties(author) } AS finalResource
    RETURN notification {
      .*,
      from: finalResource,
      to: properties(user),
      email: email,
      relatedUser: properties(author)
    }
  `
  const session = context.driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      const notificationTransactionResponse = await transaction.run(cypher, {
        postId,
        reason,
        groupId,
        userId: context.user.id,
      })
      return notificationTransactionResponse.records.map((record) => record.get('notification'))
    })
  } finally {
    await session.close()
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
    OPTIONAL MATCH (owner)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
    SET notification.read = FALSE
    SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
    SET notification.updatedAt = toString(datetime())
    SET notification.relatedUserId = $userId
    WITH owner, emailAddress.email as email, group { __typename: 'Group', .*, myRole: membership.roleInGroup } AS finalGroup, user, notification
    RETURN notification {.*, from: finalGroup, to: properties(owner), email: email, relatedUser: properties(user) }
  `
  const session = context.driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      const notificationTransactionResponse = await transaction.run(cypher, {
        groupId,
        reason,
        userId,
      })
      return notificationTransactionResponse.records.map((record) => record.get('notification'))
    })
  } finally {
    await session.close()
  }
}

const notifyMemberOfGroup = async (groupId, userId, reason, context) => {
  const { user: owner } = context
  const cypher = `
    MATCH (owner:User { id: $ownerId })
    MATCH (user:User { id: $userId })
    MATCH (group:Group { id: $groupId })
    OPTIONAL MATCH (user)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
    OPTIONAL MATCH (user)-[membership:MEMBER_OF]->(group)
    WITH user, group, owner, membership, emailAddress
    MERGE (group)-[notification:NOTIFIED {reason: $reason}]->(user)
    WITH group, user, notification, owner, membership, emailAddress
    SET notification.read = FALSE
    SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
    SET notification.updatedAt = toString(datetime())
    SET notification.relatedUserId = $ownerId
    WITH group { __typename: 'Group', .*, myRole: membership.roleInGroup } AS finalGroup,
    notification, user, emailAddress.email as email, owner
    RETURN notification {.*, from: finalGroup, to: properties(user), email: email, relatedUser: properties(owner) }
  `
  const session = context.driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      const notificationTransactionResponse = await transaction.run(cypher, {
        groupId,
        reason,
        userId,
        ownerId: owner.id,
      })
      return notificationTransactionResponse.records.map((record) => record.get('notification'))
    })
  } finally {
    await session.close()
  }
}

/**
 * Notify everyone a post or comment MENTIONS — once per resource, ever.
 *
 * Both mutations of a resource run this, and an edit hands over every mention the new content
 * carries, unchanged ones included. Without the `NOT EXISTS` guard below, MERGE would find the
 * existing edge and the unconditional `SET notification.read = FALSE` further down would flip a
 * long-read notification back to unread, push it to the top of the bell, reset the unread badge
 * and send a second mail — for a typo fix. That is the same "resurrection" the split of
 * Create/UpdatePost fixed for followers and group members (see `handleUpdatePost`); it lived on
 * here because the mention path is shared between creating and editing on purpose.
 *
 * The guard drops those recipients before the MERGE, so there is no row at all: no edge written,
 * no `read` reset, no subscription, no mail. It is a no-op on creation — a resource that was just
 * created has no NOTIFIED edges — and it deliberately does NOT catch the one notification an edit
 * legitimately produces: a mention ADDED while editing has no edge yet.
 *
 * Being told once is the whole of what this notification says. It carries no indication of which
 * revision mentioned you, so a second alert about the same post conveys nothing the first did not.
 */
const notifyUsersOfMention = async (label, id, idsOfUsers, reason, context) => {
  if (!idsOfUsers?.length) {
    return []
  }
  await validateNotifyUsers(label, reason)
  let mentionedCypher
  switch (reason) {
    case 'mentioned_in_post': {
      mentionedCypher = `
        MATCH (post: Post { id: $id })<-[:WROTE]-(author: User)
        MATCH (user: User)
          WHERE user.id in $idsOfUsers
          AND NOT (user)-[:BLOCKED]-(author)
          AND NOT (user)-[:MUTED]->(author)
        OPTIONAL MATCH (user)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
        OPTIONAL MATCH (post)-[:IN]->(group:Group)
        OPTIONAL MATCH (group)<-[membership:MEMBER_OF]-(user)
        WITH post, author, user, group, emailAddress
        // The parentheses are load-bearing: unparenthesised, \`A OR B OR C AND D\` binds as
        // \`A OR B OR (C AND D)\`, and the group rule would wave every non-member through.
        WHERE (group IS NULL OR group.groupType = 'public' OR membership.role IN ['usual', 'admin', 'owner'])
        // Already told about this post — see the note on this function.
        AND NOT EXISTS { MATCH (post)-[:NOTIFIED { reason: $reason }]->(user) }
        MERGE (post)-[notification:NOTIFIED {reason: $reason}]->(user)
        WITH post AS resource, notification, user, emailAddress
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
        AND NOT (user)-[:MUTED]->(commenter)
        AND NOT (user)-[:MUTED]->(postAuthor)
      OPTIONAL MATCH (user)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
      OPTIONAL MATCH (post)-[:IN]->(group:Group)
      OPTIONAL MATCH (group)<-[membership:MEMBER_OF]-(user)
      WITH comment, user, group, emailAddress
      // Parenthesised for the same reason as in the post branch above.
      WHERE (group IS NULL OR group.groupType = 'public' OR membership.role IN ['usual', 'admin', 'owner'])
      // Already told about this comment — see the note on this function.
      AND NOT EXISTS { MATCH (comment)-[:NOTIFIED { reason: $reason }]->(user) }
      MERGE (comment)-[notification:NOTIFIED {reason: $reason}]->(user)
      WITH comment AS resource, notification, user, emailAddress
      `
      break
    }
  }
  mentionedCypher += `
    WITH notification, user, resource, emailAddress,
    [(resource)<-[:WROTE]-(author:User) | author {.*}] AS authors,
    [(resource)-[:COMMENTS]->(post:Post)<-[:WROTE]-(author:User) | post{.*, author: properties(author)} ] AS posts
    WITH resource, user, emailAddress.email as email, notification, authors, posts,
    resource {.*, __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'Group']][0], author: authors[0], post: posts[0]} AS finalResource
    SET notification.read = FALSE
    SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
    SET notification.updatedAt = toString(datetime())
    RETURN notification {.*, from: finalResource, to: properties(user), email: email, relatedUser: properties(user) }
  `
  const session = context.driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      const notificationTransactionResponse = await transaction.run(mentionedCypher, {
        id,
        idsOfUsers,
        reason,
      })
      return notificationTransactionResponse.records.map((record) => record.get('notification'))
    })
  } finally {
    await session.close()
  }
}

/**
 * Tell everyone observing the post that a comment appeared — once per comment, ever.
 *
 * `handleContentDataOfComment` serves CreateComment AND UpdateComment, so this ran again on every
 * edit of a comment: the MERGE found the existing edge, `read` was reset to FALSE and a second
 * mail went out to EVERY observer of the post, because someone fixed a typo in a reply. Same
 * defect as the mention path (see `notifyUsersOfMention`), with a larger audience — observers of
 * the post rather than the people named in it.
 *
 * Hence the `NOT EXISTS` guard: an observer already told about this comment produces no row, so
 * nothing is written, reset, published or mailed. A no-op on CreateComment, where no edge exists
 * yet. An edit of a comment is not news; its appearance was.
 */
const notifyUsersOfComment = async (label, commentId, reason, context) => {
  await validateNotifyUsers(label, reason)
  const session = context.driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      const notificationTransactionResponse = await transaction.run(
        `
        MATCH (observingUser:User)-[:OBSERVES { active: true }]->(post:Post)<-[:COMMENTS]-(comment:Comment { id: $commentId })<-[:WROTE]-(commenter:User)
          WHERE NOT (observingUser)-[:BLOCKED]-(commenter)
          AND NOT (observingUser)-[:MUTED]->(commenter)
          AND NOT observingUser.id = $userId
          // Already told about this comment — see the note on this function. Safe to append as
          // a bare AND here: this WHERE is a chain of ANDs, unlike the group rule in
          // notifyUsersOfMention, which needed parentheses.
          AND NOT EXISTS { MATCH (comment)-[:NOTIFIED { reason: $reason }]->(observingUser) }
        OPTIONAL MATCH (observingUser)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
        WITH observingUser, emailAddress, post, comment, commenter
        MATCH (postAuthor:User)-[:WROTE]->(post)
        MERGE (comment)-[notification:NOTIFIED {reason: $reason}]->(observingUser)
        SET notification.read = FALSE
        SET notification.createdAt = COALESCE(notification.createdAt, toString(datetime()))
        SET notification.updatedAt = toString(datetime())
        WITH notification, observingUser, emailAddress.email as email, post, commenter, postAuthor,
        comment {.*, __typename: labels(comment)[0], author: properties(commenter), post:  post {.*, author: properties(postAuthor) } } AS finalResource
        RETURN notification {
          .*,
          from: finalResource,
          to: properties(observingUser),
          email: email,
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
  } finally {
    await session.close()
  }
}

const handleCreateMessage: IMiddlewareResolver = async (
  resolve,
  root,
  args,
  context,
  resolveInfo,
) => {
  // Execute resolver
  const message = await resolve(root, args, context, resolveInfo)

  // Query Parameters
  const roomId = args.roomId || message?.room?.id
  const {
    user: { id: currentUserId },
  } = context

  // For CreateRoomWithMessage, roomId is not in args — query it from the message
  const session = context.driver.session()
  try {
    let resolvedRoomId = roomId
    if (!resolvedRoomId && message?.id) {
      const roomResult = await session.readTransaction((transaction) => {
        return transaction.run(
          `MATCH (m:Message { id: $messageId })-[:INSIDE]->(room:Room) RETURN room.id AS roomId`,
          { messageId: message.id },
        )
      })
      resolvedRoomId = roomResult.records[0]?.get('roomId')
    }
    if (!resolvedRoomId) {
      return message
    }

    const { senderUser, recipients } = await session.readTransaction(async (transaction) => {
      const messageRecipientsCypher = `
          MATCH (senderUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })
          MATCH (room)<-[:CHATS_IN]-(recipientUser:User)-[:PRIMARY_EMAIL]->(emailAddress:EmailAddress)
            WHERE NOT recipientUser.id = $currentUserId
            AND NOT (recipientUser)-[:BLOCKED]-(senderUser)
            AND NOT (recipientUser)-[:MUTED]->(senderUser)
          OPTIONAL MATCH (room)-[:ROOM_FOR]->(group:Group)<-[mutedGroup:MUTED]-(recipientUser)
          RETURN senderUser {.*}, recipientUser {.*}, emailAddress {.email},
            mutedGroup IS NOT NULL AS isGroupMuted
        `
      const txResponse = await transaction.run(messageRecipientsCypher, {
        currentUserId,
        roomId: resolvedRoomId,
      })

      return {
        senderUser: txResponse.records.map((record) => record.get('senderUser'))[0],
        recipients: txResponse.records.map((record) => ({
          user: record.get('recipientUser'),
          email: record.get('emailAddress')?.email,
          isGroupMuted: record.get('isGroupMuted'),
        })),
      }
    })

    const roomProperties = await getRoomProperties(resolvedRoomId, session)

    // Send subscriptions and emails to all recipients
    for (const recipient of recipients) {
      const recipientUser = recipient.user
      const { email } = recipient

      // send subscriptions.
      // The falsy side cannot happen from here: `recipients` comes from a query that MATCHes the
      // same room, so a room whose properties are gone has no recipients and this loop does not
      // run at all. Kept because getRoomProperties is nullable by contract.
      /* v8 ignore next -- unreachable: no recipients exist for a room that has no properties */
      if (roomProperties) {
        void context.pubsub.publish(ROOM_UPDATED, {
          roomUpdated: roomProperties,
          userId: recipientUser.id,
        })
      }
      void context.pubsub.publish(CHAT_MESSAGE_ADDED, {
        chatMessageAdded: { ...message, seen: false },
        userId: recipientUser.id,
      })

      // Send EMail if we found a user(not blocked) and he is not considered online
      if (
        email &&
        recipientUser.emailNotificationsChatMessage !== false &&
        !isUserOnline(recipientUser) &&
        !recipient.isGroupMuted
      ) {
        void sendChatMessageMail({ email, senderUser, recipientUser })
      }
    }

    // Return resolver result to client
    return message
  } finally {
    await session.close()
  }
}

export default {
  Mutation: {
    CreatePost: handleCreatePost,
    UpdatePost: handleUpdatePost,
    CreateComment: handleContentDataOfComment,
    UpdateComment: handleContentDataOfComment,
    JoinGroup: handleJoinGroup,
    LeaveGroup: handleLeaveGroup,
    ChangeGroupMemberRole: handleChangeGroupMemberRole,
    RemoveUserFromGroup: handleRemoveUserFromGroup,
    CreateMessage: handleCreateMessage,
  },
}
