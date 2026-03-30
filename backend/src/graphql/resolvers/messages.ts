/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { withFilter } from 'graphql-subscriptions'
import { neo4jgraphql } from 'neo4j-graphql-js'

import CONFIG from '@config/index'
import { CHAT_MESSAGE_ADDED, CHAT_MESSAGE_STATUS_UPDATED } from '@constants/subscriptions'

import { attachments } from './attachments/attachments'
import Resolver from './helpers/Resolver'

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

export default {
  Subscription: {
    chatMessageAdded: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(CHAT_MESSAGE_ADDED),
        async (payload, variables, context) => {
          const isRecipient = payload.userId === context.user?.id
          if (isRecipient && payload.chatMessageAdded?.id) {
            const session = context.driver.session()
            try {
              const results = await setMessagesAsDistributed(
                [payload.chatMessageAdded.id],
                session,
              )
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
        },
      ),
    },
    chatMessageStatusUpdated: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(CHAT_MESSAGE_STATUS_UPDATED),
        (payload, variables, context) => {
          return payload.authorId === context.user?.id
        },
      ),
    },
  },
  Query: {
    Message: async (object, params, context, resolveInfo) => {
      const { roomId } = params
      delete params.roomId
      if (!params.filter) params.filter = {}
      params.filter.room = {
        id: roomId,
        users_some: {
          id: context.user.id,
        },
      }

      const resolved = await neo4jgraphql(object, params, context, resolveInfo)

      if (resolved) {
        const undistributedMessagesIds = resolved
          .filter((msg) => !msg.distributed && msg.senderId !== context.user.id)
          .map((msg) => msg.id)
        if (undistributedMessagesIds.length > 0) {
          const session = context.driver.session()
          try {
            const results = await setMessagesAsDistributed(undistributedMessagesIds, session)
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
              seen: true
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
        // Notify message authors that their messages have been seen
        for (const record of result.records) {
          const roomId = record.get('roomId')
          const authorId = record.get('authorId')
          void context.pubsub.publish(CHAT_MESSAGE_STATUS_UPDATED, {
            authorId,
            chatMessageStatusUpdated: { roomId, messageIds, status: 'seen' },
          })
        }
        return true
      } finally {
        await session.close()
      }
    },
  },
  Message: {
    ...Resolver('Message', {
      hasOne: {
        author: '<-[:CREATED]-(related:User)',
        room: '-[:INSIDE]->(related:Room)',
      },
      hasMany: {
        files: '-[:ATTACHMENT]-(related:File)',
      },
    }),
  },
}
