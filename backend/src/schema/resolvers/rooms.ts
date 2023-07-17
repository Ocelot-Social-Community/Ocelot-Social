import { neo4jgraphql } from 'neo4j-graphql-js'
import Resolver from './helpers/Resolver'

export default {
  Query: {
    Room: async (object, params, context, resolveInfo) => {
      if (!params.filter) params.filter = {}
      params.filter.users_some = {
        id: context.user.id,
      }
      return neo4jgraphql(object, params, context, resolveInfo)
    },
    UnreadRooms: async (object, params, context, resolveInfo) => {
      const {
        user: { id: currentUserId },
      } = context
      const session = context.driver.session()
      const readTxResultPromise = session.readTransaction(async (transaction) => {
        const unreadRoomsCypher = `
          MATCH (:User { id: $currentUserId })-[:CHATS_IN]->(room:Room)<-[:INSIDE]-(message:Message)<-[:CREATED]-(sender:User)
          WHERE NOT sender.id = $currentUserId AND NOT message.seen
          RETURN toString(COUNT(DISTINCT room)) AS count
        `
        const unreadRoomsTxResponse = await transaction.run(unreadRoomsCypher, { currentUserId })
        return unreadRoomsTxResponse.records.map((record) => record.get('count'))[0]
      })
      try {
        const count = await readTxResultPromise
        return count
      } finally {
        session.close()
      }
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
          WITH room, user, currentUser
          OPTIONAL MATCH (room)<-[:INSIDE]-(message:Message)<-[:CREATED]-(sender:User)
          WHERE NOT sender.id = $currentUserId AND NOT message.seen
          WITH room, user, currentUser, message,
          user.name AS roomName
          RETURN room {
            .*,
            users: [properties(currentUser), properties(user)],
            roomName: roomName,
            unreadCount: toString(COUNT(DISTINCT message))
          }
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
      undefinedToNull: ['lastMessageAt'],
      hasMany: {
        users: '<-[:CHATS_IN]-(related:User)',
      },
    }),
  },
}
