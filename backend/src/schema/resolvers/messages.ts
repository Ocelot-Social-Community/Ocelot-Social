import { neo4jgraphql } from 'neo4j-graphql-js'
import Resolver from './helpers/Resolver'
import { withFilter } from 'graphql-subscriptions'
import { pubsub, CHAT_MESSAGE_ADDED } from '../../server'

export default {
  Subscription: {
    chatMessageAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(CHAT_MESSAGE_ADDED),
        (payload, variables) => {
          return payload.chatMessageAdded.senderId !== variables.userId
        },
      ),
    },
  },
  Query: {
    Message: async (object, params, context, resolveInfo) => {
      const { roomId } = params
      delete params.roomId
      if (!params.filter) params.filter = {}
      params.filter.room = {
        id: roomId,
        users_some: {
          id: context.user.id,
        },
      }

      const resolved = await neo4jgraphql(object, params, context, resolveInfo)

      if (resolved) {
        const undistributedMessagesIds = resolved
          .filter((msg) => !msg.distributed && msg.senderId !== context.user.id)
          .map((msg) => msg.id)
        if (undistributedMessagesIds.length > 0) {
          const session = context.driver.session()
          const writeTxResultPromise = session.writeTransaction(async (transaction) => {
            const setDistributedCypher = `
              MATCH (m:Message) WHERE m.id IN $undistributedMessagesIds
              SET m.distributed = true
              RETURN m { .* }
            `
            const setDistributedTxResponse = await transaction.run(setDistributedCypher, {
              undistributedMessagesIds,
            })
            const messages = await setDistributedTxResponse.records.map((record) => record.get('m'))
            return messages
          })
          try {
            await writeTxResultPromise
          } finally {
            session.close()
          }
          // send subscription to author to updated the messages
        }
        resolved.forEach((message) => {
          message._id = message.id
          if (message.senderId !== context.user.id) {
            message.distributed = true
          }
        })
      }
      return resolved.reverse()
    },
  },
  Mutation: {
    CreateMessage: async (_parent, params, context, _resolveInfo) => {
      const { roomId, content } = params
      const {
        user: { id: currentUserId },
      } = context
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createMessageCypher = `
          MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })
          OPTIONAL MATCH (m:Message)-[:INSIDE]->(room)
          WITH MAX(m.indexId) as maxIndex, room, currentUser
          CREATE (currentUser)-[:CREATED]->(message:Message {
            createdAt: toString(datetime()),
            id: apoc.create.uuid(),
            indexId: CASE WHEN maxIndex IS NOT NULL THEN maxIndex + 1 ELSE 0 END,
            content: $content,
            saved: true,
            distributed: false,
            seen: false
          })-[:INSIDE]->(room)
          RETURN message { .*, room: properties(room), senderId: currentUser.id }
        `
        const createMessageTxResponse = await transaction.run(createMessageCypher, {
          currentUserId,
          roomId,
          content,
        })
        const [message] = await createMessageTxResponse.records.map((record) =>
          record.get('message'),
        )

        // send subscriptions
        await pubsub.publish(CHAT_MESSAGE_ADDED, { chatMessageAdded: message })

        return message
      })
      try {
        const message = await writeTxResultPromise
        return message
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    MarkMessagesAsSeen: async (_parent, params, context, _resolveInfo) => {
      const { messageIds } = params
      const currentUserId = context.user.id
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const setSeenCypher = `
          MATCH (m:Message)<-[:CREATED]-(user:User)
          WHERE m.id IN $messageIds AND NOT user.id = $currentUserId
          SET m.seen = true
          RETURN m { .* }
        `
        const setSeenTxResponse = await transaction.run(setSeenCypher, {
          messageIds,
          currentUserId,
        })
        const messages = await setSeenTxResponse.records.map((record) => record.get('m'))
        return messages
      })
      try {
        await writeTxResultPromise
        // send subscription to author to updated the messages
        return true
      } finally {
        session.close()
      }
    },
  },
  Message: {
    ...Resolver('Message', {
      hasOne: {
        author: '<-[:CREATED]-(related:User)',
        room: '-[:INSIDE]->(related:Room)',
      },
    }),
  },
}
