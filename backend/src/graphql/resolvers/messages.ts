/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { withFilter } from 'graphql-subscriptions'

import CONFIG from '@config/index'
import {
  CHAT_MESSAGE_ADDED,
  CHAT_MESSAGE_STATUS_UPDATED,
  ROOM_UPDATED,
} from '@constants/subscriptions'
import { ForbiddenError } from '@graphql/errors'

import { attachments } from './attachments/attachments'
import cypherFields, { underscoreIdResolver, unwrap } from './helpers/cypherField'
import { pagingClause } from './helpers/paging'
import Resolver from './helpers/Resolver'
import { getRoomProperties, groupChatGated, roomIsGroupRoom } from './rooms'

import type { File } from './attachments/attachments'

const setMessagesAsDistributed = async (undistributedMessagesIds, session) => {
  return session.writeTransaction(async (transaction) => {
    const setDistributedCypher = `
      MATCH (m:Message) WHERE m.id IN $undistributedMessagesIds
      SET m.distributed = true
      WITH m
      MATCH (m)-[:INSIDE]->(room:Room)
      MATCH (m)<-[:CREATED]-(author:User)
      RETURN DISTINCT room.id AS roomId, author.id AS authorId, collect(m.id) AS messageIds
    `
    const result = await transaction.run(setDistributedCypher, {
      undistributedMessagesIds,
    })
    return result.records.map((record) => ({
      roomId: record.get('roomId'),
      authorId: record.get('authorId'),
      messageIds: record.get('messageIds'),
    }))
  })
}

export const chatMessageAddedFilter = async (payload, context) => {
  const isRecipient = payload.userId === context.user?.id
  if (isRecipient && payload.chatMessageAdded?.id) {
    const session = context.driver.session()
    try {
      const results = await setMessagesAsDistributed([payload.chatMessageAdded.id], session)
      for (const { roomId, authorId, messageIds } of results) {
        void context.pubsub.publish(CHAT_MESSAGE_STATUS_UPDATED, {
          authorId,
          chatMessageStatusUpdated: { roomId, messageIds, status: 'distributed' },
        })
      }
    } finally {
      await session.close()
    }
  }
  return isRecipient
}

export const chatMessageStatusUpdatedFilter = (payload, context) => {
  return payload.authorId === context.user?.id
}

export default {
  Subscription: {
    chatMessageAdded: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(CHAT_MESSAGE_ADDED),
        async (payload, variables, context) => chatMessageAddedFilter(payload, context),
      ),
    },
    chatMessageStatusUpdated: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(CHAT_MESSAGE_STATUS_UPDATED),
        (payload, variables, context) => chatMessageStatusUpdatedFilter(payload, context),
      ),
    },
  },
  Query: {
    Message: async (_object, params, context, _resolveInfo) => {
      const { roomId, beforeIndex } = params
      // Group chat is gated by the groups feature: while it is off, a group room's messages
      // are not served (its history stays in the DB, just inaccessible). DM rooms are unaffected.
      if (groupChatGated(context) && roomId) {
        const session = context.driver.session()
        try {
          if (await roomIsGroupRoom(roomId, session)) {
            return []
          }
        } finally {
          await session.close()
        }
      }
      // AUTHORISATION: the CHATS_IN edge replaces the `filter.room.users_some` that used to
      // be handed to neo4jgraphql, and it is the only thing keeping a non-participant out of
      // a room's history. It sits in the match pattern so a message can only be reached
      // through a room the current user actually chats in.
      //
      // `senderId` is projected alongside the properties: it is a former @cypher field, and
      // the distribution fallback below reads it. Supplying it here also means Message's
      // field resolver finds it on the parent and skips its own query.
      const messageSession = context.driver.session()
      let resolved
      try {
        const beforeIndexClause =
          beforeIndex !== undefined && beforeIndex !== null
            ? 'WHERE message.indexId < toInteger($beforeIndex)'
            : ''
        // Ordering is fixed to indexId DESC — the only value _MessageOrdering offers, and
        // what the beforeIndex cursor assumes. Previously an omitted orderBy left the order
        // undefined; pinning it is strictly more predictable.
        const paging = pagingClause(params)

        resolved = await messageSession.readTransaction(async (transaction) => {
          const result = await transaction.run(
            `
              MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })
              MATCH (room)<-[:INSIDE]-(message:Message)
              ${beforeIndexClause}
              WITH message
              ORDER BY message.indexId DESC
              ${paging.clause}
              RETURN message {
                .*,
                senderId: head([(message)<-[:CREATED]-(sender:User) | sender.id])
              } AS message
            `,
            {
              currentUserId: context.user.id,
              roomId,
              beforeIndex: beforeIndex ?? null,
              ...paging.params,
            },
          )
          // unwrap: indexId is a Bolt integer and would fail GraphQL's Int serialiser.
          return result.records.map((record) => unwrap(record.get('message')))
        })
      } finally {
        await messageSession.close()
      }

      // No `if (resolved)` guard here, and no `|| []` below: the assignment above is
      // unconditional — the transaction either produced an array or threw, in which case this
      // line is never reached. Both used to be written defensively and were simply unreachable.
      //
      // Mark undistributed messages as distributed (fallback for missed socket deliveries)
      const undistributedMessagesIds = resolved
        .filter((msg) => !msg.distributed && msg.senderId !== context.user.id)
        .map((msg) => msg.id)
      if (undistributedMessagesIds.length > 0) {
        const session = context.driver.session()
        try {
          const results = await setMessagesAsDistributed(undistributedMessagesIds, session)
          for (const { roomId: msgRoomId, authorId, messageIds } of results) {
            void context.pubsub.publish(CHAT_MESSAGE_STATUS_UPDATED, {
              authorId,
              chatMessageStatusUpdated: { roomId: msgRoomId, messageIds, status: 'distributed' },
            })
          }
        } finally {
          await session.close()
        }
      }
      return resolved.reverse()
    },
  },
  Mutation: {
    CreateMessage: async (_parent, params, context, _resolveInfo) => {
      const { roomId, userId, content, files = [] } = params
      const {
        user: { id: currentUserId },
      } = context

      if (userId && userId === currentUserId) {
        throw new Error('Cannot create a room with self')
      }

      if (!roomId && !userId) {
        throw new Error('Either roomId or userId must be provided')
      }

      if (!content?.trim() && files.length === 0) {
        throw new Error('Message must have content or files')
      }

      const session = context.driver.session()

      try {
        // Block posting into a group room while the groups feature is off (the userId/DM path
        // can never resolve a group room, so only the roomId path needs the check). Inside the
        // try so the finally closes the session even if roomIsGroupRoom() throws on a DB error.
        if (roomId && groupChatGated(context) && (await roomIsGroupRoom(roomId, session))) {
          throw new ForbiddenError('Not Authorized!')
        }

        return await session.writeTransaction(async (transaction) => {
          // If userId is provided, find-or-create a DM room first
          if (userId) {
            await transaction.run(
              `
              MATCH (currentUser:User { id: $currentUserId })
              MATCH (user:User { id: $userId })
              OPTIONAL MATCH (currentUser)-[:CHATS_IN]->(existingRoom:Room)<-[:CHATS_IN]-(user)
              WHERE NOT (existingRoom)-[:ROOM_FOR]->(:Group)
              WITH currentUser, user, collect(existingRoom)[0] AS existingRoom
              WITH currentUser, user, existingRoom
              WHERE existingRoom IS NULL
              CREATE (currentUser)-[:CHATS_IN]->(:Room {
                createdAt: toString(datetime()),
                id: apoc.create.uuid()
              })<-[:CHATS_IN]-(user)
              `,
              { currentUserId, userId },
            )
          }

          // Resolve the room — either by roomId or by finding the DM room with userId
          const matchRoom = roomId
            ? `MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })`
            : `MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room)<-[:CHATS_IN]-(user:User { id: $userId })
               WHERE NOT (room)-[:ROOM_FOR]->(:Group)`

          const createMessageCypher = `
            ${matchRoom}
            OPTIONAL MATCH (currentUser)-[:AVATAR_IMAGE]->(image:Image)
            OPTIONAL MATCH (existing:Message)-[:INSIDE]->(room)
            WITH room, currentUser, image, MAX(existing.indexId) AS maxIndex
            SET room.messageCounter = CASE
                  WHEN room.messageCounter IS NOT NULL THEN room.messageCounter + 1
                  WHEN maxIndex IS NOT NULL THEN maxIndex + 2
                  ELSE 1
                END,
                room.lastMessageAt = toString(datetime())
            WITH room, currentUser, image
            CREATE (currentUser)-[:CREATED]->(message:Message {
              createdAt: toString(datetime()),
              id: apoc.create.uuid(),
              indexId: room.messageCounter - 1,
              content: LEFT($content,2000),
              saved: true,
              distributed: false
            })-[:INSIDE]->(room)
            WITH message, currentUser, image, room
            OPTIONAL MATCH (room)<-[:CHATS_IN]-(recipient:User)
              WHERE NOT recipient.id = $currentUserId
            WITH message, currentUser, image, collect(recipient) AS recipients
            FOREACH (r IN recipients | CREATE (r)-[:HAS_NOT_SEEN]->(message))
            RETURN message {
              .*,
              indexId: toString(message.indexId),
              senderId: currentUser.id,
              username: currentUser.name,
              avatar: image.url,
              date: message.createdAt,
              seen: false
            }
          `
          const txResponse = await transaction.run(createMessageCypher, {
            currentUserId,
            roomId,
            userId,
            content,
          })

          const [message] = txResponse.records.map((record) => record.get('message'))

          if (!message) {
            return null
          }

          const atns: File[] = []

          for await (const file of files) {
            const atn = await attachments(CONFIG).add(
              message,
              'ATTACHMENT',
              file,
              {},
              {
                transaction,
              },
            )
            atns.push(atn)
          }

          return { ...message, files: atns }
        })
      } finally {
        await session.close()
      }
    },
    MarkMessagesAsSeen: async (_parent, params, context, _resolveInfo) => {
      const { messageIds } = params
      const currentUserId = context.user.id
      const session = context.driver.session()
      try {
        const result = await session.writeTransaction(async (transaction) => {
          const cypher = `
            MATCH (user:User { id: $currentUserId })-[r:HAS_NOT_SEEN]->(m:Message)
            WHERE m.id IN $messageIds
            DELETE r
            WITH m
            MATCH (m)-[:INSIDE]->(room:Room)
            MATCH (m)<-[:CREATED]-(author:User)
            RETURN DISTINCT room.id AS roomId, author.id AS authorId
          `
          return transaction.run(cypher, {
            messageIds,
            currentUserId,
          })
        })
        const roomIds = new Set<string>()
        // Notify message authors that their messages have been seen
        for (const record of result.records) {
          const roomId = record.get('roomId')
          const authorId = record.get('authorId')
          roomIds.add(roomId)
          void context.pubsub.publish(CHAT_MESSAGE_STATUS_UPDATED, {
            authorId,
            chatMessageStatusUpdated: { roomId, messageIds, status: 'seen' },
          })
        }
        // Notify the reader that their per-room unread count has changed.
        // Best-effort: the write is already committed and MarkMessagesAsSeen retries
        // are idempotent, so we swallow both read and publish errors here — the next
        // subscription event will self-heal client state. publish() is awaited (not
        // voided) so async broker rejections (e.g. Redis outage) land in the catch
        // instead of escaping as unhandled rejections.
        for (const roomId of roomIds) {
          try {
            const roomProperties = await getRoomProperties(roomId, session)
            await context.pubsub.publish(ROOM_UPDATED, {
              roomUpdated: roomProperties,
              userId: currentUserId,
            })
            // eslint-disable-next-line no-catch-all/no-catch-all -- see block comment above
          } catch {
            // Intentionally ignored — see block comment above.
          }
        }
        return true
      } finally {
        await session.close()
      }
    },
  },
  Message: {
    ...underscoreIdResolver,
    ...Resolver('Message', {
      hasOne: {
        author: '<-[:CREATED]-(related:User)',
        room: '-[:INSIDE]->(related:Room)',
      },
      hasMany: {
        files: '-[:ATTACHMENT]-(related:File)',
      },
    }),
    // Verbatim from the @cypher directives in Message.gql. senderId/username/date are
    // non-null, so an unresolved one kills the chatMessageAdded payload it appears in.
    ...cypherFields('Message', {
      // A message whose author is gone matches nothing and returns no row at all —
      // verified against the database. Both fields are non-null, so the fallback keeps the
      // message (and the payload carrying it) intact instead of losing it to the author.
      senderId: {
        statement: 'MATCH (this)<-[:CREATED]-(user:User) RETURN user.id',
        fallback: '',
      },
      username: {
        statement: 'MATCH (this)<-[:CREATED]-(user:User) RETURN user.name',
        fallback: '',
      },
      avatar: 'MATCH (this)<-[:CREATED]-(:User)-[:AVATAR_IMAGE]->(image:Image) RETURN image.url',
      date: 'RETURN this.createdAt',
      seen: `
        MATCH (this)<-[:CREATED]-(author:User)
        OPTIONAL MATCH (unseer:User)-[:HAS_NOT_SEEN]->(this)
        WHERE CASE
          WHEN author.id = $cypherParams.currentUserId THEN true
          ELSE unseer.id = $cypherParams.currentUserId
        END
        RETURN count(unseer) = 0
      `,
    }),
  },
  File: {
    extension: (parent: { extension?: string | null }) => parent.extension ?? null,
    duration: (parent: { duration?: number | null }) => parent.duration ?? null,
  },
}
