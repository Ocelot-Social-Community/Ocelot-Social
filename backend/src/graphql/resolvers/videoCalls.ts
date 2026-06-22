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
import { withTimeout } from '@src/livekit/utils'
import logger from '@src/logger'

import type { PermissionKey } from '@src/permission'
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

// The videoConference policy is the single runtime switch. Its effective value already
// folds in the LiveKit env requirements (requiresEnv), so an enabled call is guaranteed
// to have the secrets the RoomService below needs.
const ensureEnabled = (enabled: boolean) => {
  if (!enabled) {
    throw new Error('Video calls are disabled.')
  }
}

// The permission that gates OPENING (being the first into) a call, per group type.
// Joining an existing call needs none of these — only group membership.
const openPermissionForGroupType = (groupType: string): PermissionKey | null => {
  switch (groupType) {
    case 'public':
      return 'videoCall.create_public'
    case 'closed':
      return 'videoCall.create_closed'
    case 'hidden':
      return 'videoCall.create_hidden'
    default:
      return null
  }
}

// Returns the group's type if the user is a member with a participating role
// (usual/admin/owner); throws ForbiddenError otherwise. Video calls are available in
// every group type now — who may OPEN one is gated per type by permission (above),
// while joining stays open to any member.
const getGroupMembershipType = async (
  driver: Driver,
  groupId: string,
  currentUserId: string,
): Promise<string> => {
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
    return result.records[0].get('groupType') as string
  } finally {
    await session.close()
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
    await getGroupMembershipType(driver, groupId, userId)
    membershipCache.set(key, now + MEMBERSHIP_CACHE_TTL_MS)
    return true
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch {
    return false
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
          return assertGroupMembershipCached(context.driver, payload.groupId, context.user.id)
        },
      ),
    },
  },
  Query: {
    videoCallConfig: (_root, _args, context) => ({
      enabled: context.policy.getEffective('videoConference'),
    }),
    videoCallParticipantCount: async (_root, params: { groupId: string }, context) => {
      ensureEnabled(context.policy.getEffective('videoConference'))
      // Viewing the count (and joining) only needs membership — opening is gated below.
      await getGroupMembershipType(context.driver, params.groupId, context.user.id)
      return getLiveParticipantCount(context.config, roomNameForGroup(params.groupId))
    },
  },
  Mutation: {
    joinGroupVideoCall: async (_root, params: { groupId: string }, context) => {
      ensureEnabled(context.policy.getEffective('videoConference'))
      const groupType = await getGroupMembershipType(
        context.driver,
        params.groupId,
        context.user.id,
      )
      const roomName = roomNameForGroup(params.groupId)
      // OPENING a call (no live participants yet → LiveKit room not created) is gated
      // per group type. JOINING an existing call (count > 0) stays open to any member.
      const participantCount = await getLiveParticipantCount(context.config, roomName)
      if (participantCount === 0) {
        const permission = openPermissionForGroupType(groupType)
        if (!permission || !context.effectivePermissions.has(permission)) {
          throw new ForbiddenError('You may not start a video call in this group.')
        }
      }
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
