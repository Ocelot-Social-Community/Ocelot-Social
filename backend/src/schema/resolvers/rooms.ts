import { v4 as uuid } from 'uuid'
import { neo4jgraphql } from 'neo4j-graphql-js'
import Resolver from './helpers/Resolver'

export default {
  Query: {
    Room:  async (object, params, context, resolveInfo) => {
      if (!params.filter) params.filter = {}
      params.filter.users_some = {
        id: context.user.id,
      }
      const resolved = await neo4jgraphql(object, params, context, resolveInfo)
      if (resolved) {
        resolved.forEach((room) => {
          if (room.users) {
            room.users.forEach((user) => {
              user._id = user.id
            })
          }
        })
      }
      return resolved
    },
  },
  Mutation: {
    CreateRoom: async (_parent, params, context, _resolveInfo) => {
      const { userId } = params
      const { user: { id: currentUserId } } = context
      const roomId = uuid()
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createRoomCypher = `
          MATCH (currentUser:User { id: $currentUserId })
          MATCH (user:User { id: $userId })
          MERGE (currentUser)-[:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(user)
          SET room.createdAt = toString(datetime()),
          room.id = $roomId
          RETURN room { .* }
        `
        const createRommTxResponse = await await transaction.run(
          createRoomCypher,
          { userId, currentUserId, roomId }
        )
        const [room] = await createRommTxResponse.records.map((record) =>
                                                              record.get('room'),
                                                             )
        return room
      })
      try {
        const room = await writeTxResultPromise
        if (room) {
          room.roomId = room.id
        }
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
