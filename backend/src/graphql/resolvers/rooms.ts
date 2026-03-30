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
      MATCH (user:User { id: $userId })-[:HAS_NOT_SEEN]->(message:Message)-[:INSIDE]->(room:Room)<-[:CHATS_IN]-(user)
      OPTIONAL MATCH (message)<-[:CREATED]-(sender:User)
      WHERE (user)-[:BLOCKED]->(sender) OR (user)-[:MUTED]->(sender)
      WITH room, message, sender
      WHERE sender IS NULL
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
      // Single room lookup by userId or groupId
      if (params.userId || params.groupId) {
        const session = context.driver.session()
        try {
          const cypher = params.groupId
            ? `
              MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room)-[:ROOM_FOR]->(group:Group { id: $groupId })
              RETURN room { .* } AS room
            `
            : `
              MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(user:User { id: $userId })
              WHERE NOT (room)-[:ROOM_FOR]->(:Group)
              RETURN room { .* } AS room
            `
          const result = await session.readTransaction(async (transaction) => {
            return transaction.run(cypher, {
              currentUserId: context.user.id,
              userId: params.userId || null,
              groupId: params.groupId || null,
            })
          })
          const rooms = result.records.map((record) => record.get('room'))
          if (rooms.length === 0) return []
          // Re-query via neo4jgraphql to get all computed fields
          delete params.userId
          delete params.groupId
          params.filter = { users_some: { id: context.user.id } }
          params.id = rooms[0].id
          return neo4jgraphql(object, params, context, resolveInfo)
        } finally {
          await session.close()
        }
      }

      // Single room lookup by id
      if (params.id) {
        if (!params.filter) params.filter = {}
        params.filter.users_some = { id: context.user.id }
        return neo4jgraphql(object, params, context, resolveInfo)
      }

      // Room list with cursor-based pagination sorted by latest activity
      const session = context.driver.session()
      try {
        const first = params.first || 10
        const before = params.before || null
        const result = await session.readTransaction(async (transaction) => {
          const cypher = `
            MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room)
            WITH room, COALESCE(room.lastMessageAt, room.createdAt) AS sortDate
            ${before ? 'WHERE sortDate < $before' : ''}
            RETURN room.id AS id
            ORDER BY sortDate DESC
            LIMIT toInteger($first)
          `
          return transaction.run(cypher, {
            currentUserId: context.user.id,
            first,
            before,
          })
        })
        const roomIds = result.records.map((record) => record.get('id'))
        if (roomIds.length === 0) return []
        // Batch query via neo4jgraphql with id_in filter (avoids N+1)
        const roomParams = {
          filter: {
            id_in: roomIds,
            users_some: { id: context.user.id },
          },
        }
        const rooms = await neo4jgraphql(object, roomParams, context, resolveInfo)
        // Preserve the sort order from the cursor query
        const orderMap = new Map(roomIds.map((id, i) => [id, i]))
        return (rooms || []).sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
      } finally {
        await session.close()
      }
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
    CreateGroupRoom: async (_parent, params, context, _resolveInfo) => {
      const { groupId } = params
      const {
        user: { id: currentUserId },
      } = context
      const session = context.driver.session()
      try {
        const room = await session.writeTransaction(async (transaction) => {
          // Step 1: Create/merge the room and add all active group members to it
          const createGroupRoomCypher = `
            MATCH (currentUser:User { id: $currentUserId })-[membership:MEMBER_OF]->(group:Group { id: $groupId })
            WHERE membership.role IN ['usual', 'admin', 'owner']
            MERGE (room:Room)-[:ROOM_FOR]->(group)
            ON CREATE SET
              room.createdAt = toString(datetime()),
              room.id = apoc.create.uuid()
            WITH room, group, currentUser
            MATCH (member:User)-[m:MEMBER_OF]->(group)
            WHERE m.role IN ['usual', 'admin', 'owner']
            MERGE (member)-[:CHATS_IN]->(room)
            WITH room, group, currentUser, collect(properties(member)) AS members
            OPTIONAL MATCH (currentUser)-[:HAS_NOT_SEEN]->(message:Message)-[:INSIDE]->(room)
            WITH room, group, members, COUNT(DISTINCT message) AS unread
            OPTIONAL MATCH (group)-[:AVATAR_IMAGE]->(groupImg:Image)
            RETURN room {
              .*,
              roomName: group.name,
              avatar: groupImg.url,
              isGroupRoom: true,
              group: properties(group),
              users: members,
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
