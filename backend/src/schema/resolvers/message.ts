import { v4 as uuid } from 'uuid'
import { neo4jgraphql } from 'neo4j-graphql-js'

export default {
  Query: {
    Message:  async (object, params, context, resolveInfo) => {
      if (!params.filter) params.filter = {}
      params.filter.room = {
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
      const messageId = uuid()
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createMessageCypher = `
          MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })
          MERGE (currentUser)-[:CREATED]->(message:Message)-[:INSIDE]->(room)
          SET message.createdAt = toString(datetime()),
          message.id = $messageId
          message.content = $content
          RETURN message { .* }
        `
        const createMessageTxResponse = await transaction.run(
          createMessageCypher,
          { currentUserId, roomId, messageId, content }
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
}
