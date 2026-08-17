/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-shadow */
import { withFilter } from 'graphql-subscriptions'

import { ROOM_UPDATED } from '@constants/subscriptions'

import cypherFields, { underscoreIdResolver, unwrap } from './helpers/cypherField'
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
    Room: async (_object, params, context, _resolveInfo) => {
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
          const rooms = result.records.map((record) => unwrap(record.get('room')))
          if (rooms.length === 0) return []
          // The match above already restricts to rooms the current user CHATS_IN, so the
          // authorisation the old `users_some` filter provided is covered here. Computed
          // fields no longer need the second pass through neo4jgraphql — Room's field
          // resolvers fetch them from these plain properties.
          // Kept to one room, as the previous `params.id = rooms[0].id` did.
          return [rooms[0]]
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
        // AUTHORISATION: the CHATS_IN edge in this match is what used to be the
        // `filter.users_some = { id: currentUser }` handed to neo4jgraphql — and on this
        // branch it is the ONLY membership check. A room the user does not chat in must
        // not match, so the edge belongs in the pattern, not in a WHERE that could be
        // relaxed later.
        const session = context.driver.session()
        try {
          const result = await session.readTransaction((transaction) =>
            transaction.run(
              `
                MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })
                RETURN room { .* } AS room
              `,
              { currentUserId: context.user.id, roomId: params.id },
            ),
          )
          return result.records.map((record) => unwrap(record.get('room')))
        } finally {
          await session.close()
        }
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
            RETURN room { .* } AS room
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
        // Returns the rooms themselves rather than ids for a second, neo4jgraphql-driven
        // batch query. That second pass existed only to fill the computed fields, which
        // Room's own field resolvers now handle — so the whole round trip disappears, and
        // with it the re-sorting that had to undo the batch query's arbitrary order.
        // Membership is enforced by the CHATS_IN edge in the match above (previously the
        // `users_some` filter).
        return result.records.map((record) => unwrap(record.get('room')))
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
    ...underscoreIdResolver,
    ...Resolver('Room', {
      hasMany: {
        users: '<-[:CHATS_IN]-(related:User)',
      },
      hasOne: {
        group: '-[:ROOM_FOR]->(related:Group)',
      },
      count: {
        // Unread messages for the current viewer, ignoring blocked and muted senders.
        // Expressed through the generic count helper so it batches like every other field
        // — it used to be a hand-written loader in context/loaders.ts, which is now pure
        // infrastructure. Anchoring on CREATED keeps the original semantics: only messages
        // that actually have an author count.
        unreadCount: `<-[:INSIDE]-(related:Message)<-[:CREATED]-(sender:User)
          WHERE EXISTS {
            MATCH (viewer:User { id: $cypherParams.currentUserId })-[:HAS_NOT_SEEN]->(related)
          }
          AND NOT EXISTS {
            MATCH (viewer:User { id: $cypherParams.currentUserId })-[:BLOCKED|MUTED]->(sender)
          }`,
      },
    }),
    // Statements lifted verbatim from the @cypher directives in Room.gql. Without these,
    // a Room that did not come from a neo4jgraphql() translation — every roomUpdated
    // subscription payload, for one — leaves roomId/isGroupRoom/roomName unresolved, and
    // being non-null they take the whole payload down with them.
    ...cypherFields('Room', {
      roomId: 'RETURN this.id',
      isGroupRoom: `
        OPTIONAL MATCH (this)-[:ROOM_FOR]->(g:Group)
        RETURN g IS NOT NULL
      `,
      roomName: `
        OPTIONAL MATCH (this)-[:ROOM_FOR]->(g:Group)
        WITH this, g
        OPTIONAL MATCH (this)<-[:CHATS_IN]-(user:User)
        WHERE g IS NULL AND NOT user.id = $cypherParams.currentUserId
        RETURN COALESCE(g.name, user.name)
      `,
      avatar: `
        OPTIONAL MATCH (this)-[:ROOM_FOR]->(g:Group)
        OPTIONAL MATCH (g)-[:AVATAR_IMAGE]->(groupImg:Image)
        WITH this, g, groupImg
        OPTIONAL MATCH (this)<-[:CHATS_IN]-(user:User)
        WHERE g IS NULL AND NOT user.id = $cypherParams.currentUserId
        OPTIONAL MATCH (user)-[:AVATAR_IMAGE]->(userImg:Image)
        RETURN COALESCE(groupImg.url, userImg.url)
      `,
      lastMessage: `
        MATCH (this)<-[:INSIDE]-(message:Message)
        WITH message ORDER BY message.indexId DESC LIMIT 1
        RETURN message
      `,
    }),
    // Batched: a chat list of N rooms resolves in ONE Cypher statement instead of N.
    // The loader is request-scoped and already bound to the current user (context/loaders).
  },
}
