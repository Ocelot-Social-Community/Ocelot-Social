import { v4 as uuid } from 'uuid'

export default {
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
        return room
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }      
    }
  }
}
