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
      // this does not work
      // params.orderBy = ['createdAt_desc']
      const resolved = await neo4jgraphql(object, params, context, resolveInfo)

      if (resolved) {
        const session = context.driver.session()
        const countMessageTxPromise = session.readTransaction(async (transaction) => {
          const countMessageCypher = `
          MATCH((message:Message)-[:INSIDE]->(:Room { id: $roomId })) RETURN COUNT(message) AS count
          `
          const countMessageTxResponse = await transaction.run(countMessageCypher, {
            roomId,
          })
          return await countMessageTxResponse.records[0].get('count')
        })
        try {
          const count = await countMessageTxPromise
          for (let i = 0; i < resolved.length; i++) {
            resolved[i]._id = resolved[i].id
            resolved[i].indexId = count - 1 - params.offset - i
          }
        } catch (error) {
          throw new Error(error)
        } finally {
          session.close()
        }
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
            content: $content
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
