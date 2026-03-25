/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-shadow */
import { withFilter } from 'graphql-subscriptions'
import { neo4jgraphql } from 'neo4j-graphql-js'

import { ROOM_COUNT_UPDATED } from '@constants/subscriptions'

import Resolver from './helpers/Resolver'

export const getUnreadRoomsCount = async (userId, session) => {
  return session.readTransaction(async (transaction) => {
    const unreadRoomsCypher = `
      MATCH (user:User { id: $userId })-[:CHATS_IN]->(room:Room)<-[:INSIDE]-(message:Message)<-[:CREATED]-(sender:User)
      WHERE NOT sender.id = $userId AND NOT message.seen
      AND NOT (user)-[:BLOCKED]->(sender)
      AND NOT (user)-[:MUTED]->(sender)
      RETURN toString(COUNT(DISTINCT room)) AS count
    `
    const unreadRoomsTxResponse = await transaction.run(unreadRoomsCypher, { userId })
    return unreadRoomsTxResponse.records.map((record) => record.get('count'))[0]
  })
}

export default {
  Subscription: {
    roomCountUpdated: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(ROOM_COUNT_UPDATED),
        (payload, variables, context) => {
          return payload.userId === context.user?.id
        },
      ),
    },
  },
  Query: {
    Room: async (object, params, context, resolveInfo) => {
      if (!params.filter) params.filter = {}
      params.filter.users_some = {
        id: context.user.id,
      }
      return neo4jgraphql(object, params, context, resolveInfo)
    },
    UnreadRooms: async (_object, _params, context, _resolveInfo) => {
      const {
        user: { id: currentUserId },
      } = context
      const session = context.driver.session()
      try {
        const count = await getUnreadRoomsCount(currentUserId, session)
        return count
      } finally {
        await session.close()
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
      try {
        const room = await session.writeTransaction(async (transaction) => {
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
          const createRoomTxResponse = await transaction.run(createRoomCypher, {
            userId,
            currentUserId,
          })
          const [room] = createRoomTxResponse.records.map((record) => record.get('room'))
          return room
        })
        if (room) {
          room.roomId = room.id
        }
        return room
      } finally {
        await session.close()
      }
    },
    CreateGroupRoom: async (_parent, params, context, _resolveInfo) => {
      const { groupId } = params
      const {
        user: { id: currentUserId },
      } = context
      const session = context.driver.session()
      try {
        const room = await session.writeTransaction(async (transaction) => {
          const createGroupRoomCypher = `
            MATCH (currentUser:User { id: $currentUserId })-[membership:MEMBER_OF]->(group:Group { id: $groupId })
            WHERE membership.role IN ['usual', 'admin', 'owner']
            MERGE (room:Room)-[:ROOM_FOR]->(group)
            ON CREATE SET
              room.createdAt = toString(datetime()),
              room.id = apoc.create.uuid()
            MERGE (currentUser)-[:CHATS_IN]->(room)
            WITH room, group, currentUser
            OPTIONAL MATCH (room)<-[:INSIDE]-(message:Message)<-[:CREATED]-(sender:User)
            WHERE NOT sender.id = $currentUserId AND NOT message.seen
            WITH room, group, currentUser, COUNT(DISTINCT message) AS unread
            OPTIONAL MATCH (group)-[:AVATAR_IMAGE]->(groupImg:Image)
            RETURN room {
              .*,
              roomName: group.name,
              avatar: groupImg.url,
              isGroupRoom: true,
              group: properties(group),
              users: [properties(currentUser)],
              unreadCount: toString(unread)
            }
          `
          const createGroupRoomTxResponse = await transaction.run(createGroupRoomCypher, {
            groupId,
            currentUserId,
          })
          const [room] = createGroupRoomTxResponse.records.map((record) => record.get('room'))
          return room
        })
        if (!room) {
          throw new Error('Could not create group room. User may not be a member of the group.')
        }
        room.roomId = room.id
        return room
      } finally {
        await session.close()
      }
    },
  },
  Room: {
    ...Resolver('Room', {
      undefinedToNull: ['lastMessageAt'],
      hasMany: {
        users: '<-[:CHATS_IN]-(related:User)',
      },
      hasOne: {
        group: '-[:ROOM_FOR]->(related:Group)',
      },
    }),
  },
}
