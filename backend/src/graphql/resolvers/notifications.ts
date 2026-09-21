/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { withFilter } from 'graphql-subscriptions'

import { NOTIFICATION_ADDED } from '@constants/subscriptions'

const NOTIFICATION_PROJECTION = `
  WITH user, notification, resource
  OPTIONAL MATCH (relatedUser:User { id: notification.relatedUserId })
  WITH user, notification, resource, relatedUser,
  [(resource)<-[:WROTE]-(author:User) | author {.*}] AS authors,
  [(resource)-[:COMMENTS]->(post:Post)<-[:WROTE]-(author:User) | post{.*, author: properties(author), postType: [l IN labels(post) WHERE NOT l = 'Post']} ] AS posts
  OPTIONAL MATCH (resource)<-[membership:MEMBER_OF]-(user)
  WITH resource, user, notification, authors, posts, membership, relatedUser,
  resource {.*, __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'Group']][0], author: authors[0], post: posts[0], myRole: membership.role} AS finalResource
  RETURN notification {.*, from: finalResource, to: properties(user), relatedUser: properties(relatedUser)}
`

const setNotificationReadState = async (
  context,
  { resourceId, targetRead }: { resourceId?: string; targetRead: boolean },
) => {
  const { user: currentUser } = context
  const session = context.driver.session()
  const resourceFilter = resourceId ? '{id: $resourceId}' : ''
  const fromState = targetRead ? 'FALSE' : 'TRUE'
  const toState = targetRead ? 'TRUE' : 'FALSE'
  const params: Record<string, string> = { id: currentUser.id }
  if (resourceId) {
    params.resourceId = resourceId
  }

  const writeTxResultPromise = session.writeTransaction(async (transaction) => {
    const response = await transaction.run(
      `
        MATCH (resource ${resourceFilter})-[notification:NOTIFIED {read: ${fromState}}]->(user:User {id:$id})
        SET notification.read = ${toState}
        ${NOTIFICATION_PROJECTION}
      `,
      params,
    )
    return response.records.map((record) => record.get('notification'))
  })
  try {
    return await writeTxResultPromise
  } finally {
    await session.close()
  }
}

export default {
  Subscription: {
    notificationAdded: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(NOTIFICATION_ADDED),
        (payload, variables, context) => {
          return payload.notificationAdded.to.id === context.user?.id
        },
      ),
    },
  },
  Query: {
    notifications: async (_parent, args, context, _resolveInfo) => {
      const { user: currentUser } = context
      const session = context.driver.session()
      let readCondition, orderByClause

      // An AND rather than its own WHERE: the visibility condition below is unconditional, so
      // this one can only ever narrow it further.
      switch (args.read) {
        case true:
          readCondition = 'AND notification.read = TRUE'
          break
        case false:
          readCondition = 'AND notification.read = FALSE'
          break
        default:
          readCondition = ''
      }
      switch (args.orderBy) {
        case 'updatedAt_asc':
          orderByClause = 'ORDER BY notification.updatedAt ASC'
          break
        case 'updatedAt_desc':
          orderByClause = 'ORDER BY notification.updatedAt DESC'
          break
        default:
          orderByClause = ''
      }
      const offset = args.offset && typeof args.offset === 'number' ? `SKIP ${args.offset}` : ''
      const limit = args.first && typeof args.first === 'number' ? `LIMIT ${args.first}` : ''

      const readTxResultPromise = session.readTransaction(async (transaction) => {
        const notificationsTransactionResponse = await transaction.run(
          ` 
          MATCH (resource {deleted: false, disabled: false})-[notification:NOTIFIED]->(user:User {id:$id})
          // Never hand out a notification about something the recipient may not open. A
          // notification is not a pointer, it is CONTENT: it carries the title, the author and
          // the group of its resource. Listing one for an unreachable post leaks exactly what
          // the group's visibility exists to withhold, and offers a dead link on top.
          //
          // The condition is the one every post query applies (helpers/postFilter.ts,
          // \`invisibleTo\`), reached through the parent post when the resource is a comment —
          // CANNOT_SEE points at posts, and a comment is as unreachable as the post carrying it.
          //
          // Defence in depth, not the fix: notifications like these should not be WRITTEN, and
          // notificationsMiddleware no longer writes them. This is what keeps the next such bug
          // from reaching a bell, and what makes the ones already in the database harmless.
          WHERE NOT EXISTS {
            MATCH (user)-[:CANNOT_SEE]->(post:Post)
            WHERE post = resource OR (resource)-[:COMMENTS]->(post)
          }
          ${readCondition}
          OPTIONAL MATCH (relatedUser:User { id: notification.relatedUserId })
          OPTIONAL MATCH (resource)<-[membership:MEMBER_OF]-(user)
          WITH user, notification, resource, membership, relatedUser,
          [(resource)<-[:WROTE]-(author:User) | author {.*}] AS authors,
          [(resource)-[:COMMENTS]->(post:Post)<-[:WROTE]-(author:User) | post {.*, author: properties(author), postType: [l IN labels(post) WHERE NOT l = 'Post']} ] AS posts
          WITH resource, user, notification, authors, posts, relatedUser, membership,
          resource {.*,
            __typename: [l IN labels(resource) WHERE l IN ['Post', 'Comment', 'Group']][0],
            author: authors[0],
            post: posts[0],
            myRole: membership.role } AS finalResource
          RETURN notification {.*,
            from: finalResource,
            to: properties(user),
            relatedUser: properties(relatedUser)
          }
          ${orderByClause}
          ${offset} ${limit}
          `,
          { id: currentUser.id },
        )
        return notificationsTransactionResponse.records.map((record) => record.get('notification'))
      })
      try {
        const notifications = await readTxResultPromise
        return notifications
      } finally {
        await session.close()
      }
    },
  },
  Mutation: {
    markAsRead: async (_parent, args, context, _resolveInfo) => {
      const [notification] = await setNotificationReadState(context, {
        resourceId: args.id,
        targetRead: true,
      })
      return notification
    },
    markAsUnread: async (_parent, args, context, _resolveInfo) => {
      const [notification] = await setNotificationReadState(context, {
        resourceId: args.id,
        targetRead: false,
      })
      return notification
    },
    markAllAsRead: async (_parent, _args, context, _resolveInfo) => {
      return setNotificationReadState(context, { targetRead: true })
    },
  },
  NOTIFIED: {
    id: async (parent) => {
      // serialize an ID to help the client update the cache
      return `${parent.reason}/${parent.from.id}/${parent.to.id}`
    },
  },
}
