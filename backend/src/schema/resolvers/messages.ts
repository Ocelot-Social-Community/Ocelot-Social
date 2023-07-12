import { neo4jgraphql } from 'neo4j-graphql-js'
import Resolver from './helpers/Resolver'

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
        resolved.forEach((message) => {
          message._id = message.id
          if (message.senderId !== context.user.id) {
            message.distributed = true
          }
        })
      }
      return resolved
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
          CREATE (currentUser)-[:CREATED]->(message:Message {
            createdAt: toString(datetime()),
            id: apoc.create.uuid(),
            content: $content,
            saved: true,
            distributed: false,
            seen: false
          })-[:INSIDE]->(room)
          RETURN message { .* }
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
        return message
      } catch (error) {
        throw new Error(error)
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
