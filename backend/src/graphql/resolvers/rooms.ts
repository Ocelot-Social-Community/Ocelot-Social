/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-shadow */
import { withFilter } from 'graphql-subscriptions'
import { neo4jgraphql } from 'neo4j-graphql-js'

import { ROOM_UPDATED } from '@constants/subscriptions'

import Resolver from './helpers/Resolver'

// excludeGroupRooms: when the groups feature is off, group rooms must not count towards the
// unread badge (they are hidden everywhere else too). The rest of the query is unchanged.
export const getUnreadRoomsCount = async (userId, session, excludeGroupRooms = false) => {
  return session.readTransaction(async (transaction) => {
    const groupRoomFilter = excludeGroupRooms ? 'AND NOT (room)-[:ROOM_FOR]->(:Group)' : ''
    const unreadRoomsCypher = `
      MATCH (user:User { id: $userId })-[:HAS_NOT_SEEN]->(message:Message)-[:INSIDE]->(room:Room)<-[:CHATS_IN]-(user)
      WHERE true ${groupRoomFilter}
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

// Whether the groups feature is currently off for this request — group chat (rooms, their
// messages, unread counts, chat-target search) is hidden/blocked while it is. Default false
// (feature on) if no policy service is on the context, so chat never breaks on a missing policy.
export const groupChatGated = (context) => context.policy?.getEffective('groupsEnabled') === false

// Whether a room is a group room (has a ROOM_FOR edge to a Group). Used to block messaging in
// a group room while the groups feature is off, without denying DM rooms (shared mutations).
export const roomIsGroupRoom = async (roomId, session) => {
  return session.readTransaction(async (transaction) => {
    const result = await transaction.run(
      'MATCH (room:Room { id: $roomId }) RETURN EXISTS((room)-[:ROOM_FOR]->(:Group)) AS isGroup',
      { roomId },
    )
    return result.records[0]?.get('isGroup') === true
  })
}

export const getRoomProperties = async (roomId, session) => {
  return session.readTransaction(async (transaction) => {
    const result = await transaction.run(
      'MATCH (room:Room { id: $roomId }) RETURN properties(room) AS room',
      { roomId },
    )
    return result.records[0]?.get('room') ?? null
  })
}

// The per-room unread count moved to context/loaders.ts, where the same Cypher answers
// every room of a request in one statement. Nothing calls it one room at a time any more.

export const roomUpdatedFilter = (payload, variables, context) => {
  return payload.userId === context.user?.id
}

export default {
  Subscription: {
    roomUpdated: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(ROOM_UPDATED),
        roomUpdatedFilter,
      ),
    },
  },
  Query: {
    Room: async (object, params, context, resolveInfo) => {
      // Group chat is gated by the groups feature: while it is off, no group room is served
      // (not fetched by groupId, not listed) and its messages are blocked (see messages.ts).
      // Existing rooms/messages stay in the DB and reappear when the feature is re-enabled.
      const groupsOff = groupChatGated(context)
      if (groupsOff && params.groupId) return []

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
        // Groups off ⇒ a known/cached group room id must not resolve either. neo4j-graphql-js
        // generates no filter for the single `group` relation (_RoomFilter only exposes the
        // `users_*` filters), so there is no declarative "not a group room" filter to add to
        // the lookup — guard with an explicit EXISTS check (mirrors the messages.ts gate).
        // Only runs while the feature is off (a network-wide admin state), so it adds no cost
        // to normal operation; for a group room it returns early *instead of* the main query.
        if (groupsOff) {
          const session = context.driver.session()
          try {
            if (await roomIsGroupRoom(params.id, session)) return []
          } finally {
            await session.close()
          }
        }
        if (!params.filter) params.filter = {}
        params.filter.users_some = { id: context.user.id }
        return neo4jgraphql(object, params, context, resolveInfo)
      }

      // Room list with cursor-based pagination sorted by latest activity
      const session = context.driver.session()
      try {
        const first = params.first || 10
        const before = params.before || null
        const search = params.search || null
        const result = await session.readTransaction(async (transaction) => {
          const conditions: string[] = []
          if (before) conditions.push('sortDate < $before')
          if (search) conditions.push('toLower(roomName) CONTAINS toLower($search)')
          // Groups off ⇒ drop group rooms from the chat list entirely (they carry a ROOM_FOR
          // edge to a Group). `g` is kept in the WITH so it can be filtered here.
          if (groupsOff) conditions.push('g IS NULL')
          const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
          const cypher = `
            MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room)
            OPTIONAL MATCH (room)-[:ROOM_FOR]->(g:Group)
            OPTIONAL MATCH (room)<-[:CHATS_IN]-(otherUser:User)
              WHERE g IS NULL AND otherUser.id <> $currentUserId
            WITH room, g, COALESCE(room.lastMessageAt, room.createdAt) AS sortDate,
                 COALESCE(g.name, otherUser.name) AS roomName
            ${whereClause}
            RETURN room.id AS id
            ORDER BY sortDate DESC
            LIMIT toInteger($first)
          `
          return transaction.run(cypher, {
            currentUserId: context.user.id,
            first,
            before,
            search,
          })
        })
        const roomIds: string[] = result.records.map((record) => record.get('id') as string)
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
        const orderMap = new Map<string, number>(roomIds.map((id, i) => [id, i]))
        return (rooms || []).sort(
          (a: { id: string }, b: { id: string }) =>
            (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0),
        )
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
        // Exclude group rooms from the unread badge while the groups feature is off.
        const count = await getUnreadRoomsCount(currentUserId, session, groupChatGated(context))
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
    // Batched: a chat list of N rooms resolves in ONE Cypher statement instead of N.
    // The loader is request-scoped and already bound to the current user (context/loaders).
    unreadCount: async (parent, _args, context) => {
      if (!parent?.id) return 0
      return context.loaders.roomUnreadCount.load(parent.id)
    },
  },
}
