import { neo4jgraphql } from 'neo4j-graphql-js'
import Resolver from './helpers/Resolver'

export default {
  Query: {
    Room:  async (object, params, context, resolveInfo) => {
      if (!params.filter) params.filter = {}
      params.filter.users_some = {
        id: context.user.id,
      }
      return neo4jgraphql(object, params, context, resolveInfo)
    },
  },
  Mutation: {
    CreateRoom: async (_parent, params, context, _resolveInfo) => {
      const { userId } = params
      const { user: { id: currentUserId } } = context
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createRoomCypher = `
          MATCH (currentUser:User { id: $currentUserId })
          MATCH (user:User { id: $userId })
          MERGE (currentUser)-[:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(user)
          ON CREATE SET
          room.createdAt = toString(datetime()),
          room.id = apoc.create.uuid()
          RETURN room { .* }
        `
        const createRommTxResponse = await transaction.run(
          createRoomCypher,
          { userId, currentUserId }
        )
        const [room] = await createRommTxResponse.records.map((record) =>
                                                              record.get('room'),
                                                             )
        return room
      })
      try {
        const room = await writeTxResultPromise
        return room
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }      
    },
  },
  Room: {
    ...Resolver('Room', {
      hasMany: {
        users: '<-[:CHATS_IN]-(related:User)',
      }
    }),
  }  
}
