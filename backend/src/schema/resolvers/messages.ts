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
      return neo4jgraphql(object, params, context, resolveInfo)
    },
  },
  Mutation: {
    CreateMessage: async (_parent, params, context, _resolveInfo) => {
      const { roomId, content } = params
      const { user: { id: currentUserId } } = context
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
        const createMessageTxResponse = await transaction.run(
          createMessageCypher,
          { currentUserId, roomId, content }
        )
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
      }
    }),
  }  
}
