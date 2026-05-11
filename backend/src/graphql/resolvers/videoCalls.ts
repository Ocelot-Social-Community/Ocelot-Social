/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { withFilter } from 'graphql-subscriptions'
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@constants/subscriptions'

import type { Driver } from 'neo4j-driver'

const ROOM_PREFIX = 'group-'

export const roomNameForGroup = (groupId: string) => `${ROOM_PREFIX}${groupId}`
export const groupIdFromRoomName = (roomName: string | null | undefined): string | null =>
  roomName && roomName.startsWith(ROOM_PREFIX) ? roomName.slice(ROOM_PREFIX.length) : null

const httpUrlFor = (livekitUrl: string) =>
  livekitUrl.startsWith('wss://')
    ? livekitUrl.replace(/^wss:\/\//, 'https://')
    : livekitUrl.startsWith('ws://')
      ? livekitUrl.replace(/^ws:\/\//, 'http://')
      : livekitUrl

const ensureEnabled = (config: { LIVEKIT_ENABLED: boolean }) => {
  if (!config.LIVEKIT_ENABLED) {
    throw new Error('Video calls are disabled.')
  }
}

const assertGroupMemberOfPublicGroup = async (
  driver: Driver,
  groupId: string,
  currentUserId: string,
) => {
  const session = driver.session()
  try {
    const result = await session.readTransaction(async (tx) =>
      tx.run(
        `
          MATCH (u:User { id: $userId })-[m:MEMBER_OF]->(g:Group { id: $groupId })
          WHERE m.role IN ['usual', 'admin', 'owner']
          RETURN g.groupType AS groupType
        `,
        { userId: currentUserId, groupId },
      ),
    )
    if (result.records.length === 0) {
      throw new Error('Not a member of this group.')
    }
    const groupType = result.records[0].get('groupType') as string
    if (groupType !== 'public') {
      throw new Error('Video calls are only available for public groups.')
    }
  } finally {
    await session.close()
  }
}

export const getLiveParticipantCount = async (
  config: { LIVEKIT_URL: string; LIVEKIT_API_KEY: string; LIVEKIT_API_SECRET: string },
  roomName: string,
): Promise<number> => {
  const client = new RoomServiceClient(
    httpUrlFor(config.LIVEKIT_URL),
    config.LIVEKIT_API_KEY,
    config.LIVEKIT_API_SECRET,
  )
  try {
    const participants = await client.listParticipants(roomName)
    return participants.length
  } catch {
    // Room does not exist yet → 0 participants
    return 0
  }
}

export default {
  Subscription: {
    videoCallParticipantCountChanged: {
      resolve: (payload: { groupId: string; count: number }) => payload,
      subscribe: withFilter(
        (_root, _args, context) =>
          context.pubsub.asyncIterator(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED),
        async (
          payload: { groupId: string; count: number },
          variables: { groupId: string },
          context,
        ) => {
          if (!context.user) return false
          if (payload.groupId !== variables.groupId) return false
          try {
            await assertGroupMemberOfPublicGroup(context.driver, payload.groupId, context.user.id)
            return true
          } catch {
            return false
          }
        },
      ),
    },
  },
  Query: {
    videoCallConfig: (_root, _args, context) => ({
      enabled: !!context.config.LIVEKIT_ENABLED,
    }),
    videoCallParticipantCount: async (_root, params: { groupId: string }, context) => {
      ensureEnabled(context.config)
      await assertGroupMemberOfPublicGroup(context.driver, params.groupId, context.user.id)
      return getLiveParticipantCount(context.config, roomNameForGroup(params.groupId))
    },
  },
  Mutation: {
    joinGroupVideoCall: async (_root, params: { groupId: string }, context) => {
      ensureEnabled(context.config)
      await assertGroupMemberOfPublicGroup(context.driver, params.groupId, context.user.id)
      const roomName = roomNameForGroup(params.groupId)
      const at = new AccessToken(context.config.LIVEKIT_API_KEY, context.config.LIVEKIT_API_SECRET, {
        identity: context.user.id,
        name: context.user.name,
        ttl: '2h',
      })
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      })
      const token = await at.toJwt()
      return {
        token,
        url: context.config.LIVEKIT_URL,
        roomName,
      }
    },
  },
}
