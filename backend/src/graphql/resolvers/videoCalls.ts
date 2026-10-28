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
import { Errors } from '@graphql/errorRegistry'
import { AppError } from '@graphql/errors'
import { isActiveMembership, visibilityOf } from '@graphql/resolvers/helpers/groupAccessCypher'
import { createGroupAuthorizationScope } from '@src/groupRole/requestScope'
import { noteCountTold } from '@src/livekit/toldRooms'
import { withTimeout } from '@src/livekit/utils'
import logger from '@src/logger'

import type { Context } from '@src/context'
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

// Returns the group's type if the user has an active (non-pending) membership; throws
// VIDEO_CALL_GROUP_MEMBERSHIP_NOT_FOUND otherwise. Only the SUBSCRIPTION filter still asks
// this: the queries and mutations are covered by the shield, which decides them on the
// group rights (group.videoCall.join / group.videoCall.create) instead of on role names.
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
          WHERE ${isActiveMembership('m')}
          RETURN ${visibilityOf('g')} AS visibility
        `,
        { userId: currentUserId, groupId },
      ),
    )
    if (result.records.length === 0) {
      throw new AppError(Errors.VIDEO_CALL_GROUP_MEMBERSHIP_NOT_FOUND)
    }
    return result.records[0].get('visibility') as string
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
    if (expiresAt > now) {
      return true
    }
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

// A join token only has to get its holder INTO the room: once connected, the LiveKit
// server keeps pushing fresh tokens to the client, which uses them for reconnects. So the
// lifetime is not the call's length but how long a token kept aside stays a valid ticket —
// and with it the decisions taken when it was issued (membership, and whether the user may
// open a call nobody is in yet). Ten minutes leave room for a reconnect before the first
// refresh arrives; two hours used to let a copied token outlive both decisions.
const JOIN_TOKEN_TTL = '10m'

interface LiveKitConfig {
  LIVEKIT_URL: string
  LIVEKIT_API_KEY: string
  LIVEKIT_API_SECRET: string
}

// The LiveKit part of the server config, when it is complete. The videoConference policy
// requires it (requiresEnv), so with the feature on this is never null.
const liveKitConfigOf = ({
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
}: Partial<Record<keyof LiveKitConfig, string>>): LiveKitConfig | null =>
  LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET
    ? { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET }
    : null

const roomServiceFor = (config: LiveKitConfig) =>
  new RoomServiceClient(
    httpUrlFor(config.LIVEKIT_URL),
    config.LIVEKIT_API_KEY,
    config.LIVEKIT_API_SECRET,
  )

export interface RoomParticipants {
  /** LiveKit connections, i.e. tabs and devices — two people sharing an account count twice. */
  count: number
  /**
   * The user behind each connection, in the order they joined — a user twice for two
   * connections, like the count: it may be two people sharing an account.
   */
  userIds: string[]
}

// The user behind a connection: the join token puts it into the metadata, and the identity is
// `<userId>#<suffix>` (see joinGroupVideoCall) for a participant whose metadata is unreadable.
const userIdOf = (participant: { identity?: string; metadata?: string }): string | null => {
  try {
    const { userId } = JSON.parse(participant.metadata ?? '') as { userId?: unknown }
    if (typeof userId === 'string' && userId) {
      return userId
    }
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch {
    // fall through to the identity
  }
  const [userId] = (participant.identity ?? '').split('#')
  return userId || null
}

export const getRoomParticipants = async (
  config: LiveKitConfig,
  roomName: string,
): Promise<RoomParticipants> => {
  const client = roomServiceFor(config)
  try {
    const participants = await withTimeout(
      client.listParticipants(roomName),
      LIVEKIT_API_TIMEOUT_MS,
      'listParticipants',
    )
    const ordered = [...participants].sort(
      (a, b) => Number(a.joinedAt ?? 0) - Number(b.joinedAt ?? 0),
    )
    const userIds = ordered.map(userIdOf).filter((id): id is string => !!id)
    return { count: participants.length, userIds }
  } catch (err) {
    // Only "room not found" is a legitimate zero — the room hasn't been
    // created yet because no participant has joined. Every other error
    // (network, credentials, throttling, timeout) is a real failure that
    // would silently masquerade as "empty room" if swallowed.
    if (err instanceof TwirpError && (err.status === 404 || err.code === 'not_found')) {
      return { count: 0, userIds: [] }
    }
    logger.warn(`listParticipants failed for ${roomName}:`, err)
    throw err
  }
}

export const getLiveParticipantCount = async (
  config: LiveKitConfig,
  roomName: string,
): Promise<number> => (await getRoomParticipants(config, roomName)).count

// A call change is published to every subscriber at once, and every dock asks LiveKit the same
// question in that moment. Requests still in flight are shared, so N viewers cost one call.
// Nothing is kept once it is answered: a cached answer would be stale exactly when it matters,
// right after the change that made everybody ask.
const inFlight = new Map<string, Promise<unknown>>()
const shared = async <T>(key: string, fetch: () => Promise<T>): Promise<T> => {
  const pending = inFlight.get(key) as Promise<T> | undefined
  if (pending) {
    return pending
  }
  const request = fetch().finally(() => inFlight.delete(key))
  inFlight.set(key, request)
  return request
}

// Read paths only. Whoever DECIDES on the count — joinGroupVideoCall, opening vs. joining —
// asks LiveKit itself and never takes an answer that was fetched for somebody else.
const sharedRoomParticipants = async (config: LiveKitConfig, roomName: string) =>
  shared(`participants:${roomName}`, async () => getRoomParticipants(config, roomName))

// The groups that have a LiveKit room right now. A room lives exactly as long as somebody is in
// it (plus LiveKit's empty timeout), so this is the candidate list; the participants decide.
const listCallGroupIds = async (config: LiveKitConfig): Promise<string[]> =>
  shared('rooms', async () => {
    const rooms = await withTimeout(
      roomServiceFor(config).listRooms(),
      LIVEKIT_API_TIMEOUT_MS,
      'listRooms',
    )
    return rooms.map((room) => groupIdFromRoomName(room.name)).filter((id): id is string => !!id)
  })

/** A running call as the resolvers pass it on; `userIds` is fetched lazily when absent. */
interface ActiveVideoCallSource {
  groupId: string
  participantCount: number
  userIds?: string[]
}

// Whether the viewer may join the call in that group — the very right joining asks for, so a
// call shows up wherever the viewer could walk in, hidden groups included. Subscriptions keep
// their context for the whole connection, so the request-scoped memo of context.groupAuthorization
// would answer with the rights of the moment the client subscribed. A fresh scope per check, and
// the answer kept for a short while — both ways, since most events concern groups the viewer is
// not in, and those are the ones that would cost a read per event × subscriber. The whole cache is
// dropped at once when it gets too old, which also bounds it to the pairs asked within a window.
const MAY_JOIN_CACHE_TTL_MS = 30_000
let mayJoinCache = new Map<string, boolean>()
let mayJoinCacheSince = 0

export const mayJoinCallCached = async (context: Context, groupId: string): Promise<boolean> => {
  if (!context.user) {
    return false
  }
  const now = Date.now()
  if (now - mayJoinCacheSince > MAY_JOIN_CACHE_TTL_MS) {
    mayJoinCache = new Map()
    mayJoinCacheSince = now
  }
  const key = `${context.user.id}|${groupId}`
  const cached = mayJoinCache.get(key)
  if (cached !== undefined) {
    return cached
  }
  const authorization = await createGroupAuthorizationScope({
    database: context.database,
    userId: context.user.id,
    effectivePermissions: context.effectivePermissions,
    policy: context.policy,
  }).forGroup(groupId)
  const mayJoin = !!authorization?.has('group.videoCall.join')
  mayJoinCache.set(key, mayJoin)
  return mayJoin
}

export default {
  ActiveVideoCall: {
    group: async (call: ActiveVideoCallSource, _args, context: Context) => {
      const session = context.driver.session()
      try {
        const result = await session.readTransaction(async (tx) =>
          tx.run('MATCH (group:Group {id: $groupId}) RETURN group {.*}', {
            groupId: call.groupId,
          }),
        )
        // The group exists: both ways a call gets here asked its rights in it first.
        return result.records[0].get('group')
      } finally {
        await session.close()
      }
    },
    participants: async (call: ActiveVideoCallSource, _args, context: Context) => {
      let userIds = call.userIds
      if (!userIds) {
        // A call pushed by the subscription knows its count, not who is in it.
        const config = liveKitConfigOf(context.config)
        if (!config) {
          return []
        }
        try {
          ;({ userIds } = await sharedRoomParticipants(config, roomNameForGroup(call.groupId)))
          // eslint-disable-next-line no-catch-all/no-catch-all
        } catch {
          // Already logged. The count still stands; the faces follow with the next change.
          return []
        }
      }
      if (userIds.length === 0) {
        return []
      }
      const session = context.driver.session()
      try {
        const result = await session.readTransaction(async (tx) =>
          tx.run('MATCH (user:User) WHERE user.id IN $userIds RETURN user {.*}', { userIds }),
        )
        const byId = new Map(
          result.records.map((record) => [record.get('user').id as string, record.get('user')]),
        )
        return userIds.map((id) => byId.get(id)).filter(Boolean)
      } finally {
        await session.close()
      }
    },
  },
  Subscription: {
    activeVideoCallChanged: {
      resolve: (payload: { groupId: string; count: number }) => ({
        groupId: payload.groupId,
        call:
          payload.count > 0 ? { groupId: payload.groupId, participantCount: payload.count } : null,
      }),
      subscribe: withFilter(
        (_root, _args, context: Context) =>
          context.pubsub.asyncIterator(VIDEO_CALL_PARTICIPANT_COUNT_CHANGED),
        async (payload: { groupId: string; count: number }, _variables, context: Context) =>
          mayJoinCallCached(context, payload.groupId),
      ),
    },
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
          if (!context.user) {
            return false
          }
          if (payload.groupId !== variables.groupId) {
            return false
          }
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
      // Who may see the count is `group.videoCall.join`, enforced in the shield. No second
      // membership query here: the right IS the answer, and a group that decided to open
      // (or close) its calls for a role must not be overruled by a role-name check.
      const roomName = roomNameForGroup(params.groupId)
      const count = await getLiveParticipantCount(context.config, roomName)
      // This count may be one the poller never sees; noting it makes the next poll publish the
      // truth for the room, so the client is not left with it for good (see toldRooms.ts).
      noteCountTold(roomName, count)
      return count
    },
    activeVideoCalls: async (_root, _args, context: Context) => {
      const config = liveKitConfigOf(context.config)
      if (!context.policy.getEffective('videoConference') || !config) {
        return []
      }
      const groupIds = await listCallGroupIds(config)
      const calls = await Promise.all(
        groupIds.map(async (groupId): Promise<ActiveVideoCallSource | null> => {
          const authorization = await context.groupAuthorization.forGroup(groupId)
          if (!authorization?.has('group.videoCall.join')) {
            return null
          }
          const roomName = roomNameForGroup(groupId)
          let participants: RoomParticipants
          try {
            participants = await sharedRoomParticipants(config, roomName)
            // eslint-disable-next-line no-catch-all/no-catch-all
          } catch {
            // Already logged. One room LiveKit cannot answer for must not hide all the others.
            return null
          }
          if (participants.count === 0) {
            return null
          }
          // Same as the count query: what is told here must be corrected if it ends unseen.
          noteCountTold(roomName, participants.count)
          return { groupId, participantCount: participants.count, userIds: participants.userIds }
        }),
      )
      return calls.filter((call): call is ActiveVideoCallSource => !!call)
    },
  },
  Mutation: {
    joinGroupVideoCall: async (_root, params: { groupId: string }, context) => {
      const roomName = roomNameForGroup(params.groupId)
      // Two different acts through one mutation. JOINING an existing call (count > 0) needs
      // `group.videoCall.join`, which the shield has already checked. OPENING one (no live
      // participants yet → LiveKit room not created) needs `group.videoCall.create` IN THIS
      // GROUP — so a group may withhold starting calls from a role whose holders could
      // otherwise start one network-wide. The group right is itself capped by the network
      // `videoCall.create_<type>` (catalog: requiresNetworkPermission), which is why asking
      // the group side alone is strictly stronger than the per-type check this replaces.
      const participantCount = await getLiveParticipantCount(context.config, roomName)
      if (participantCount === 0) {
        const authorization = await context.groupAuthorization.forGroup(params.groupId)
        if (!authorization?.has('group.videoCall.create')) {
          throw new AppError(Errors.VIDEO_CALL_START_NOT_PERMITTED)
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
          ttl: JOIN_TOKEN_TTL,
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
