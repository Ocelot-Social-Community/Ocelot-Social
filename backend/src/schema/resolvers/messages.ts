import { neo4jgraphql } from 'neo4j-graphql-js'
import Resolver from './helpers/Resolver'
import { getUnreadRoomsCount } from './rooms'
import { pubsub, ROOM_COUNT_UPDATED } from '../../server'

export default {
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
          OPTIONAL MATCH (currentUser)-[:AVATAR_IMAGE]->(image:Image)
          OPTIONAL MATCH (m:Message)-[:INSIDE]->(room)
          OPTIONAL MATCH (room)<-[:CHATS_IN]-(recipientUser:User)
            WHERE NOT recipientUser.id = $currentUserId
          WITH MAX(m.indexId) as maxIndex, room, currentUser, image, recipientUser 
          CREATE (currentUser)-[:CREATED]->(message:Message {
            createdAt: toString(datetime()),
            id: apoc.create.uuid(),
            indexId: CASE WHEN maxIndex IS NOT NULL THEN maxIndex + 1 ELSE 0 END,
            content: $content,
            saved: true,
            distributed: false,
            seen: false
          })-[:INSIDE]->(room)
          SET room.lastMessageAt = toString(datetime())
          RETURN message {
            .*,
            recipientId: recipientUser.id,
            senderId: currentUser.id,
            username: currentUser.name,
            avatar: image.url,
            date: message.createdAt
          }
        `
        const createMessageTxResponse = await transaction.run(createMessageCypher, {
          currentUserId,
          roomId,
          content,
        })

        const [message] = await createMessageTxResponse.records.map((record) =>
          record.get('message'),
        )

        return message
      })
      try {
        const message = await writeTxResultPromise
        if (message) {
          const roomCountUpdated = await getUnreadRoomsCount(message.recipientId, session)

          // send subscriptions
          await pubsub.publish(ROOM_COUNT_UPDATED, { roomCountUpdated, user: message.recipientId })
        }

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
