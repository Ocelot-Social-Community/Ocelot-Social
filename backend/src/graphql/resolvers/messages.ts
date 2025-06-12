/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { withFilter } from 'graphql-subscriptions'
import { neo4jgraphql } from 'neo4j-graphql-js'

import CONFIG from '@config/index'
import { CHAT_MESSAGE_ADDED } from '@constants/subscriptions'

import { attachments } from './attachments/attachments'
import Resolver from './helpers/Resolver'

const setMessagesAsDistributed = async (undistributedMessagesIds, session) => {
  return session.writeTransaction(async (transaction) => {
    const setDistributedCypher = `
      MATCH (m:Message) WHERE m.id IN $undistributedMessagesIds
      SET m.distributed = true
      RETURN m { .* }
    `
    const setDistributedTxResponse = await transaction.run(setDistributedCypher, {
      undistributedMessagesIds,
    })
    const messages = await setDistributedTxResponse.records.map((record) => record.get('m'))
    return messages
  })
}

export default {
  Subscription: {
    chatMessageAdded: {
      subscribe: withFilter(
        (_, __, context) => context.pubsub.asyncIterator(CHAT_MESSAGE_ADDED),
        (payload, variables, context) => {
          return payload.userId === context.user?.id
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
        const session = context.driver.session()
        try {
          if (undistributedMessagesIds.length > 0) {
            await setMessagesAsDistributed(undistributedMessagesIds, session)
          }
        } finally {
          session.close()
        }
        // send subscription to author to updated the messages
      }
      return resolved.reverse()
    },
  },
  Mutation: {
    CreateMessage: async (_parent, params, context, _resolveInfo) => {
      const { roomId, content, files } = params
      const {
        user: { id: currentUserId },
      } = context
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const createMessageCypher = `
          MATCH (currentUser:User { id: $currentUserId })-[:CHATS_IN]->(room:Room { id: $roomId })
          OPTIONAL MATCH (currentUser)-[:AVATAR_IMAGE]->(image:Image)
          OPTIONAL MATCH (m:Message)-[:INSIDE]->(room)
          OPTIONAL MATCH (room)<-[:CHATS_IN]-(recipientUser:User)
            WHERE NOT recipientUser.id = $currentUserId
          WITH MAX(m.indexId) as maxIndex, room, currentUser, image, recipientUser
          CREATE (currentUser)-[:CREATED]->(message:Message {
            createdAt: toString(datetime()),
            id: apoc.create.uuid(),
            indexId: CASE WHEN maxIndex IS NOT NULL THEN maxIndex + 1 ELSE 0 END,
            content: LEFT($content,2000),
            saved: true,
            distributed: false,
            seen: false
          })-[:INSIDE]->(room)
          SET room.lastMessageAt = toString(datetime())
          RETURN message {
            .*,
            indexId: toString(message.indexId),
            recipientId: recipientUser.id,
            senderId: currentUser.id,
            username: currentUser.name,
            avatar: image.url,
            date: message.createdAt
          }
        `
        const createMessageTxResponse = await transaction.run(createMessageCypher, {
          currentUserId,
          roomId,
          content,
        })

        const [message] = await createMessageTxResponse.records.map((record) =>
          record.get('message'),
        )

        return message
      })
      try {
        // We cannot combine the query above with the attachments, since you need the resource for matching
        const message = await writeTxResultPromise

        // this is the case if the room doesn't exist - requires refactoring for implicit rooms
        if (!message) {
          return null
        }

        const session = context.driver.session()
        const writeFilesPromise = session.writeTransaction(async (transaction) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const atns: any[] = []

          const {
            AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY,
            AWS_ENDPOINT,
            AWS_REGION,
            AWS_BUCKET,
            S3_PUBLIC_GATEWAY,
          } = CONFIG

          if (
            !AWS_ACCESS_KEY_ID ||
            !AWS_SECRET_ACCESS_KEY ||
            !AWS_ENDPOINT ||
            !AWS_REGION ||
            !AWS_BUCKET
          ) {
            return atns
          }

          for await (const file of files) {
            const atn = await attachments({
              AWS_ACCESS_KEY_ID,
              AWS_SECRET_ACCESS_KEY,
              AWS_ENDPOINT,
              AWS_REGION,
              AWS_BUCKET,
              S3_PUBLIC_GATEWAY,
            }).add(
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
          return atns
        })

        const atns = await writeFilesPromise
        return { ...message, files: atns }
      } catch (error) {
        throw new Error(error)
      } finally {
        session.close()
      }
    },
    MarkMessagesAsSeen: async (_parent, params, context, _resolveInfo) => {
      const { messageIds } = params
      const currentUserId = context.user.id
      const session = context.driver.session()
      const writeTxResultPromise = session.writeTransaction(async (transaction) => {
        const setSeenCypher = `
          MATCH (m:Message)<-[:CREATED]-(user:User)
          WHERE m.id IN $messageIds AND NOT user.id = $currentUserId
          SET m.seen = true
          RETURN m { .* }
        `
        const setSeenTxResponse = await transaction.run(setSeenCypher, {
          messageIds,
          currentUserId,
        })
        const messages = await setSeenTxResponse.records.map((record) => record.get('m'))
        return messages
      })
      try {
        await writeTxResultPromise
        // send subscription to author to updated the messages
        return true
      } finally {
        session.close()
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
