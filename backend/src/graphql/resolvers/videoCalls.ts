/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { randomBytes } from 'node:crypto'

import { withFilter } from 'graphql-subscriptions'
import { AccessToken, RoomServiceClient, TwirpError } from 'livekit-server-sdk'

import { VIDEO_CALL_PARTICIPANT_COUNT_CHANGED } from '@constants/subscriptions'
import { ForbiddenError } from '@graphql/errors'
import logger from '@src/logger'

import type { Driver } from 'neo4j-driver'

const ROOM_PREFIX = 'group-'

export const roomNameForGroup = (groupId: string) => `${ROOM_PREFIX}${groupId}`
export const groupIdFromRoomName = (roomName: string | null | undefined): string | null =>
  roomName?.startsWith(ROOM_PREFIX) ? roomName.slice(ROOM_PREFIX.length) : null

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

// Cache positive membership results for a short window so the subscription
// filter doesn't fire a Neo4j read for every published event × subscriber —
// otherwise the poll-driven traffic grows O(N²) with the participant count.
// Memberships rarely change mid-call, so a 30s TTL is a safe trade-off.
const MEMBERSHIP_CACHE_TTL_MS = 30_000
const membershipCache = new Map<string, number>()

export const assertGroupMembershipCached = async (
  driver: Driver,
  groupId: string,
  userId: string,
): Promise<boolean> => {
  const key = `${userId}|${groupId}`
  const now = Date.now()
  const expiresAt = membershipCache.get(key)
  if (expiresAt !== undefined) {
    if (expiresAt > now) return true
    membershipCache.delete(key)
  }
  try {
    await assertGroupMemberOfPublicGroup(driver, groupId, userId)
    membershipCache.set(key, now + MEMBERSHIP_CACHE_TTL_MS)
    return true
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch {
    return false
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
      throw new ForbiddenError('Not a member of this group.')
    }
    const groupType = result.records[0].get('groupType') as string
    if (groupType !== 'public') {
      throw new ForbiddenError('Video calls are only available for public groups.')
    }
  } finally {
    await session.close()
  }
}

const getUserAvatarUrl = async (driver: Driver, userId: string): Promise<string | null> => {
  const session = driver.session()
  try {
    const result = await session.readTransaction(async (tx) =>
      tx.run(
        `
          MATCH (u:User { id: $userId })-[:AVATAR_IMAGE]->(img:Image)
          RETURN img.url AS url
          LIMIT 1
        `,
        { userId },
      ),
    )
    const url = result.records[0]?.get('url') as string | undefined
    return url || null
  } finally {
    await session.close()
  }
}

const LIVEKIT_API_TIMEOUT_MS = 4000

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    // eslint-disable-next-line promise/avoid-new
    new Promise<T>((_resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms.toString()}ms`))
      }, ms)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ])

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
    const participants = await withTimeout(
      client.listParticipants(roomName),
      LIVEKIT_API_TIMEOUT_MS,
      'listParticipants',
    )
    return participants.length
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err) {
    // Only "room not found" is a legitimate zero — the room hasn't been
    // created yet because no participant has joined. Every other error
    // (network, credentials, throttling, timeout) is a real failure that
    // would silently masquerade as "empty room" if swallowed.
    if (err instanceof TwirpError && (err.status === 404 || err.code === 'not_found')) {
      return 0
    }
    logger.warn(`listParticipants failed for ${roomName}:`, err)
    throw err
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
          return assertGroupMembershipCached(
            context.driver,
            payload.groupId,
            context.user.id,
          )
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
      // LiveKit treats `identity` as a unique key in a room; two connections
      // with the same identity kick each other out. Append a random suffix
      // so the same user can be present from multiple tabs / devices.
      const identity = `${String(context.user.id)}#${randomBytes(4).toString('hex')}`
      const avatarUrl = await getUserAvatarUrl(context.driver, context.user.id)
      const at = new AccessToken(
        context.config.LIVEKIT_API_KEY,
        context.config.LIVEKIT_API_SECRET,
        {
          identity,
          name: context.user.name,
          ttl: '2h',
          // Token metadata is forwarded to every other participant in the room
          // (as `participant.metadata` on the client). The frontend uses it to
          // render the real avatar instead of just initials for remote tiles.
          metadata: JSON.stringify({
            userId: context.user.id,
            avatarUrl,
          }),
        },
      )
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
