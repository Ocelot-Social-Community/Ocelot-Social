/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { withFilter } from 'graphql-subscriptions'

import CONFIG from '@config/index'
import { ROOM_UPDATED } from '@constants/subscriptions'
import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'
import { isActiveMembership } from '@graphql/resolvers/helpers/groupAccessCypher'

import { attachments, deleteStoredFiles } from './attachments/attachments'
import cypherFields, { underscoreIdResolver, unwrap } from './helpers/cypherField'
import Resolver from './helpers/Resolver'

// excludeGroupRooms: when the groups feature is off, group rooms must not count towards the
// unread badge (they are hidden everywhere else too). The rest of the query is unchanged.
//
// The conference chat of a video call never counts: it is read inside the call, and the badge
// would otherwise call back everybody who has left one that is still running.
export const getUnreadRoomsCount = async (userId, session, excludeGroupRooms = false) => {
  return session.readTransaction(async (transaction) => {
    const groupRoomFilter = excludeGroupRooms ? 'AND NOT (room)-[:ROOM_FOR]->(:Group)' : ''
    const unreadRoomsCypher = `
      MATCH (user:User { id: $userId })-[:HAS_NOT_SEEN]->(message:Message)-[:INSIDE]->(room:Room)<-[:CHATS_IN]-(user)
      WHERE NOT (room)-[:ROOM_FOR]->(:VideoCallSession) ${groupRoomFilter}
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

// What makes a room a direct conversation: it is for nothing else. A group's chat points at
// the group, the conference chat of a video call at the call — and that one must be named
// here, because two people alone in a call share a room exactly as two people in a direct
// conversation do. Asking only "not a group room" would take their conference chat for it.
export const DIRECT_ROOM = 'NOT (room)-[:ROOM_FOR]->()'

// Finds the direct room of the current user and `user`, or opens one: both chat in it. Expects
// `currentUser` and `user` bound; binds nothing new, and leaves no row when the room was there.
//
// Looking for the room and opening one are two steps: two first messages or drafts of the pair
// at the same moment would both find none and open two. Writing to both users takes their write
// locks, held until the transaction ends, so the second waits and then finds the first one's
// room. Always in the order of their ids, so two waiting for each other cannot happen; the
// property is removed again at once, nothing of it is stored.
export const OPEN_DIRECT_ROOM = `
  FOREACH (locked IN CASE WHEN currentUser.id < user.id THEN [currentUser, user] ELSE [user, currentUser] END |
    SET locked.directRoomLock = true
    REMOVE locked.directRoomLock
  )
  WITH currentUser, user
  OPTIONAL MATCH (currentUser)-[:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(user)
  WHERE ${DIRECT_ROOM}
  WITH currentUser, user, collect(room)[0] AS existingRoom
  WITH currentUser, user, existingRoom
  WHERE existingRoom IS NULL
  CREATE (currentUser)-[:CHATS_IN]->(:Room {
    createdAt: toString(datetime()),
    id: apoc.create.uuid()
  })<-[:CHATS_IN]-(user)
`

// The conference chat of a video call that is over takes no more messages, and so no drafts
// either. Expects `room` bound.
export const NOT_A_CLOSED_CALL_ROOM = `NOT EXISTS {
  MATCH (room)-[:ROOM_FOR]->(call:VideoCallSession)
  WHERE call.endedAt IS NOT NULL
}`

// As long as a message is kept, at most: a draft is one unsent.
export const DRAFT_MAX_LENGTH = 2000

// The files of the current user's draft in `room`, as `file`. Expects both bound.
export const DRAFT_FILES = '(currentUser)-[:DRAFT_FILE]->(file:File)-[:DRAFT_FILE_IN]->(room)'

// A draft is its text, its files, or both. Its time is that of its last change, and it is
// gone with the last of either: then the edge's `draftUpdatedAt` is too, which is what tells
// a room with a draft from one without. Expects `currentUser`, `chatsIn` and `room` bound.
export const TOUCH_DRAFT = `
  SET chatsIn.draftUpdatedAt = CASE
    WHEN chatsIn.draft IS NOT NULL
      OR size([(currentUser)-[:DRAFT_FILE]->(file:File)-[:DRAFT_FILE_IN]->(room) | file]) > 0
    THEN toString(datetime())
  END
`

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

// The room a draft is kept in, named by roomId, or by userId for a direct conversation: bound as
// `room`, with `currentUser` and their edge to it as `chatsIn`. A call's chat that is over keeps
// none.
const draftRoomMatch = (roomId: string | null | undefined) => `
  ${
    roomId
      ? 'MATCH (currentUser:User { id: $currentUserId })-[chatsIn:CHATS_IN]->(room:Room { id: $roomId })'
      : `MATCH (currentUser:User { id: $currentUserId })-[chatsIn:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(:User { id: $userId })
         WHERE ${DIRECT_ROOM}`
  }
  WITH currentUser, chatsIn, room
  WHERE ${NOT_A_CLOSED_CALL_ROOM}
`

// The room stopped taking drafts while a file was uploaded for one (AddRoomDraftFile).
class DraftRoomClosed extends Error {}

interface DraftRoomVariables {
  currentUserId: string
  roomId: string | null
  userId: string | null
}

/**
 * What SaveRoomDraft, AddRoomDraftFile and RemoveRoomDraftFile share: the room named, refused
 * for oneself and without a name, nothing while a group's chat is gated off (see messages.ts),
 * and — when `opensRoom` — a direct conversation without a message yet opened for the draft.
 * `work` runs in the write transaction with the match of draftRoomMatch and its variables.
 */
const inDraftRoom = async <T>(
  context,
  params: { roomId?: string | null; userId?: string | null },
  opensRoom: boolean,
  work: (transaction, matchRoom: string, variables: DraftRoomVariables) => Promise<T>,
): Promise<T | null> => {
  const { roomId, userId } = params
  const currentUserId: string = context.user.id
  if (!roomId && !userId) {
    throw new AppError(Errors.CHAT_ROOM_TARGET_MISSING)
  }
  if (userId && userId === currentUserId) {
    throw new AppError(Errors.CHAT_ROOM_PARTNER_IS_SELF)
  }
  const session = context.driver.session()
  try {
    if (roomId && groupChatGated(context) && (await roomIsGroupRoom(roomId, session))) {
      return null
    }
    return await session.writeTransaction(async (transaction) => {
      // A call's chat: its session is locked first, in a statement of its own, as ending the
      // call writes it too (callSession.ts). Whichever comes second waits for the other — a
      // draft then finds the call over, or the end finds the draft and takes it away.
      if (roomId) {
        await transaction.run(
          `
            MATCH (:Room { id: $roomId })-[:ROOM_FOR]->(call:VideoCallSession)
            SET call.draftLock = true
            REMOVE call.draftLock
          `,
          { roomId },
        )
      }
      // A direct conversation is opened for a user named alone: with a room named as well, the
      // draft goes there, and a room opened besides would be left over unused.
      if (userId && !roomId && opensRoom) {
        await transaction.run(
          `
            MATCH (currentUser:User { id: $currentUserId })
            MATCH (user:User { id: $userId })
            ${OPEN_DIRECT_ROOM}
          `,
          { currentUserId, userId },
        )
      }
      return work(transaction, draftRoomMatch(roomId), {
        currentUserId,
        roomId: roomId ?? null,
        userId: userId ?? null,
      })
    })
  } finally {
    await session.close()
  }
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
      if (groupsOff && params.groupId) {
        return []
      }

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
              WHERE ${DIRECT_ROOM}
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
          if (rooms.length === 0) {
            return []
          }
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
            if (await roomIsGroupRoom(params.id, session)) {
              return []
            }
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
          if (before) {
            conditions.push('sortDate < datetime($before)')
          }
          if (search) {
            conditions.push('toLower(roomName) CONTAINS toLower($search)')
          }
          // Groups off ⇒ drop group rooms from the chat list entirely (they carry a ROOM_FOR
          // edge to a Group). `g` is kept in the WITH so it can be filtered here.
          if (groupsOff) {
            conditions.push('g IS NULL')
          }
          const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
          const cypher = `
            MATCH (currentUser:User { id: $currentUserId })-[chatsIn:CHATS_IN]->(room:Room)
              // The conference chats of video calls are not conversations of their own: they
              // are reached from the call, not from the chat list.
              WHERE NOT (room)-[:ROOM_FOR]->(:VideoCallSession)
              // A direct room opened for a draft (SaveRoomDraft, AddRoomDraftFile) has no message yet. It is
              // listed for whoever keeps a draft in it, not for the other one: nothing was
              // said to them yet.
              AND (
                (room)-[:ROOM_FOR]->()
                OR (room)<-[:INSIDE]-(:Message)
                OR chatsIn.draftUpdatedAt IS NOT NULL
              )
            OPTIONAL MATCH (room)-[:ROOM_FOR]->(g:Group)
            OPTIONAL MATCH (room)<-[:CHATS_IN]-(otherUser:User)
              WHERE g IS NULL AND otherUser.id <> $currentUserId
            // sortDate is compared as a datetime, not as the stored string: toString(datetime())
            // drops trailing zeros of the fraction ("…04.89Z" for 890 ms, "…04Z" for 0 ms), and
            // since "Z" > any digit > "." such a string sorts after later ones of the same prefix.
            WITH room, g, datetime(COALESCE(room.lastMessageAt, room.createdAt)) AS sortDate,
                 COALESCE(g.name, otherUser.name) AS roomName
            ${whereClause}
            // roomName is projected, not just computed: this query already derives it for
            // the search filter, and the projection lets Room.roomName's pass-through use it
            // instead of asking again. Its expression MUST stay identical to the statement in
            // cypherFields below — rooms.roomName.spec.ts holds the two to that.
            RETURN room { .*, roomName: roomName } AS room
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
            WHERE ${isActiveMembership('membership')}
            MERGE (room:Room)-[:ROOM_FOR]->(group)
            ON CREATE SET
              room.createdAt = toString(datetime()),
              room.id = apoc.create.uuid()
            WITH room, group, currentUser
            MATCH (member:User)-[m:MEMBER_OF]->(group)
            WHERE ${isActiveMembership('m')}
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
          throw new AppError(Errors.CHAT_GROUP_ROOM_NOT_CREATED)
        }
        room.roomId = room.id
        return room
      } finally {
        await session.close()
      }
    },
    SaveRoomDraft: async (_parent, params, context, _resolveInfo) => {
      // Kept as typed, blanks included, no longer than a message; one of nothing but blanks is
      // none — asked of what is kept, as cutting it may leave blanks only.
      const kept = typeof params.text === 'string' ? params.text.slice(0, DRAFT_MAX_LENGTH) : ''
      const text: string | null = kept.trim() ? kept : null
      // A direct conversation without a message yet has no room: one is opened for a draft,
      // not for taking one away.
      return inDraftRoom(context, params, !!text, async (transaction, matchRoom, variables) => {
        const result = await transaction.run(
          `
            ${matchRoom}
            ${text ? 'SET chatsIn.draft = $text' : 'REMOVE chatsIn.draft'}
            ${TOUCH_DRAFT}
            RETURN room { .* } AS room
          `,
          { ...variables, text },
        )
        return result.records.map((record) => unwrap(record.get('room')))[0] ?? null
      })
    },
    // The file goes to the storage at once, as for a message; sending moves it on to the
    // message (CreateMessage, draftFiles) instead of uploading it again.
    AddRoomDraftFile: async (_parent, params, context, _resolveInfo) => {
      let uploaded: string | null = null
      try {
        return await inDraftRoom(
          context,
          params,
          true,
          async (transaction, matchRoom, variables) => {
            uploaded = null
            const found = await transaction.run(`${matchRoom} RETURN room.id AS id`, variables)
            if (!found.records.length) {
              return null
            }
            const file = await attachments(CONFIG).add(
              { id: variables.currentUserId },
              'DRAFT_FILE',
              params.file,
              {},
              { transaction },
            )
            uploaded = file.url
            // Asked again: the room may have stopped taking drafts while the file was uploaded,
            // its call ended. Then nothing of it is kept.
            const linked = await transaction.run(
              `
              ${matchRoom}
              MATCH (file:File { url: $url })
              CREATE (file)-[:DRAFT_FILE_IN]->(room)
              WITH currentUser, chatsIn, room, file
              ${TOUCH_DRAFT}
              RETURN file.url AS url
            `,
              { ...variables, url: file.url },
            )
            if (!linked.records.length) {
              throw new DraftRoomClosed()
            }
            return file
          },
        )
      } catch (error) {
        if (!(error instanceof DraftRoomClosed)) {
          throw error
        }
        // Thrown, the transaction rolled the file's node back; the upload is taken back here.
        await deleteStoredFiles(CONFIG, uploaded ? [uploaded] : [])
        return null
      }
    },
    RemoveRoomDraftFile: async (_parent, params, context, _resolveInfo) => {
      const removed = await inDraftRoom(
        context,
        params,
        false,
        async (transaction, matchRoom, variables) => {
          const result = await transaction.run(
            `
              ${matchRoom}
              MATCH ${DRAFT_FILES}
              WHERE file.url = $url
              WITH currentUser, chatsIn, room, file, file.url AS url
              DETACH DELETE file
              WITH currentUser, chatsIn, room, collect(url) AS urls
              ${TOUCH_DRAFT}
              RETURN urls
            `,
            { ...variables, url: params.url },
          )
          return (result.records[0]?.get('urls') as string[] | undefined) ?? []
        },
      )
      await deleteStoredFiles(CONFIG, removed ?? [])
      return !!removed?.length
    },
  },
  Room: {
    ...underscoreIdResolver,
    ...Resolver('Room', {
      hasMany: {
        users: '<-[:CHATS_IN]-(related:User)',
      },
      hasOne: {
        // One hop for a group's chat, two for the conference chat of a video call: that
        // one is for the call, and the call takes place in the group.
        group: '-[:ROOM_FOR|CALL_IN*1..2]->(related:Group)',
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
    // The room's own id under the name the chat frontend keys on. Resolved locally: asking
    // the database to hand back an id we already hold cost a round trip per chat list.
    roomId: (parent: { roomId?: string; id?: string }) => parent.roomId ?? parent.id ?? null,
    ...cypherFields('Room', {
      isGroupRoom: `
        OPTIONAL MATCH (this)-[:ROOM_FOR]->(g:Group)
        RETURN g IS NOT NULL
      `,
      isCallRoom: 'RETURN EXISTS((this)-[:ROOM_FOR]->(:VideoCallSession))',
      // Whether the room still takes messages: every room does, except the conference chat of
      // a video call that is over.
      isWritable: `
        OPTIONAL MATCH (this)-[:ROOM_FOR]->(call:VideoCallSession)
        RETURN call IS NULL OR call.endedAt IS NULL
      `,
      // The conference chat of a video call carries the name and avatar of the group the call
      // takes place in; \`g\` is that group there. Its participants are not looked at, which is
      // what the \`call IS NULL\` guards: they are no "other participant" to name a room after.
      roomName: {
        statement: `
          OPTIONAL MATCH (this)-[:ROOM_FOR]->(call:VideoCallSession)
          OPTIONAL MATCH (call)-[:CALL_IN]->(callGroup:Group)
          OPTIONAL MATCH (this)-[:ROOM_FOR]->(roomGroup:Group)
          WITH this, call, COALESCE(roomGroup, callGroup) AS g
          OPTIONAL MATCH (this)<-[:CHATS_IN]-(user:User)
          WHERE g IS NULL AND call IS NULL AND NOT user.id = $cypherParams.currentUserId
          RETURN COALESCE(g.name, user.name)
        `,
        // A direct room whose other participant was deleted has neither a group name nor a
        // partner name, so the COALESCE yields null — verified against the database. The
        // field is non-null, so without this the room, and with it the whole chat list,
        // would drop out of the response over one deleted account.
        fallback: '',
      },
      avatar: `
        OPTIONAL MATCH (this)-[:ROOM_FOR]->(call:VideoCallSession)
        OPTIONAL MATCH (call)-[:CALL_IN]->(callGroup:Group)
        OPTIONAL MATCH (this)-[:ROOM_FOR]->(roomGroup:Group)
        WITH this, call, COALESCE(roomGroup, callGroup) AS g
        OPTIONAL MATCH (g)-[:AVATAR_IMAGE]->(groupImg:Image)
        WITH this, call, g, groupImg
        OPTIONAL MATCH (this)<-[:CHATS_IN]-(user:User)
        WHERE g IS NULL AND call IS NULL AND NOT user.id = $cypherParams.currentUserId
        OPTIONAL MATCH (user)-[:AVATAR_IMAGE]->(userImg:Image)
        RETURN COALESCE(groupImg.url, userImg.url)
      `,
      // The viewer's own draft, from their edge to the room: nobody else's is ever read.
      draft: `
        OPTIONAL MATCH (this)<-[chatsIn:CHATS_IN]-(:User { id: $cypherParams.currentUserId })
        RETURN chatsIn.draft
      `,
      draftFiles: `
        OPTIONAL MATCH (this)<-[:DRAFT_FILE_IN]-(file:File)<-[:DRAFT_FILE]-(:User { id: $cypherParams.currentUserId })
        // As datetimes: toString(datetime()) gives the fraction of a second no fixed width, so
        // the strings do not sort by time.
        WITH file ORDER BY datetime(file.createdAt)
        RETURN collect(file { .* })
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
