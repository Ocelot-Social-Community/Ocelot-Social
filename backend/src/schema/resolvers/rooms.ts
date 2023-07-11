import { neo4jgraphql } from 'neo4j-graphql-js'
import Resolver from './helpers/Resolver'

export default {
  Query: {
    Room: async (object, params, context, resolveInfo) => {
      if (!params.filter) params.filter = {}
      params.filter.users_some = {
        id: context.user.id,
      }
      const resolved = await neo4jgraphql(object, params, context, resolveInfo)
      if (resolved) {
        resolved.forEach((room) => {
          if (room.users) {
            // buggy, you must query the username for this to function correctly
            room.roomName = room.users.filter((user) => user.id !== context.user.id)[0].name
            room.avatar =
              room.users.filter((user) => user.id !== context.user.id)[0].avatar?.url ||
              'default-avatar'
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
      const {
        user: { id: currentUserId },
      } = context
      if (userId === currentUserId) {
        throw new Error('Cannot create a room with self')
      }
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
        const createRommTxResponse = await transaction.run(createRoomCypher, {
          userId,
          currentUserId,
        })
        const [room] = await createRommTxResponse.records.map((record) => record.get('room'))
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
      },
    }),
  },
}
