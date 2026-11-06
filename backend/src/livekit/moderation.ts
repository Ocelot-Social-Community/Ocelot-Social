// Who moderates a video call, and what the media server is told about it.
//
// The moderation belongs to the call, not to the group: it is kept on the call's
// VideoCallSession (see callSession.ts) and ends with it.
//
//   (:User)-[:STARTED_CALL { handedOver }]->(session)   who opened the call; moderates it, and gets
//                                                   the moderation back on returning — unless
//                                                   they handed it on themselves.
//   (:User)-[:MODERATES_CALL]->(session)                 moderators, named one by one.
//   session.everyoneModerates                       everybody in the call moderates.
//   (:User)-[:LOST_CALL_MODERATION]->(session)       taken away by somebody who outranks them;
//                                                   only a holder of group.videoCall.moderate
//                                                   gives it back.
//   (:User)-[:HAS_CALL_FLOOR]->(session)                 given the floor: spared by "mute all".
//   (:User)-[:REMOVED_FROM_CALL]->(session)              removed from the call; no join token for
//                                                   them while the session runs.
//
// The database is the source of truth. The media server carries a copy in the room's metadata,
// which every participant receives the moment it changes — that is how the clients learn who
// moderates without a subscription of their own. What concerns one person only (muted by whom,
// removed, made a moderator) goes to that person as a data message.

import { allGroupPermissionKeys } from '@src/groupPermission'
import { dominatesInGroup } from '@src/groupRole/authority'
import { OWNER_ROLE } from '@src/groupRole/types'
import { withTimeout } from '@src/livekit/utils'
import logger from '@src/logger'

import type { GroupPermissionKey } from '@src/groupPermission'
import type { DataPacket_Kind as DataPacketKind, RoomServiceClient } from 'livekit-server-sdk'
import type { Driver } from 'neo4j-driver'

const LIVEKIT_API_TIMEOUT_MS = 4000

/** The data-message topic the clients listen on for what concerns them. */
export const MODERATION_TOPIC = 'moderation'

export interface ModerationState {
  sessionId: string
  starterId: string | null
  starterHandedOver: boolean
  moderatorIds: string[]
  everyoneModerates: boolean
  speakerIds: string[]
  revokedIds: string[]
  removedIds: string[]
}

/** Whether the user moderates the call: named as a moderator, or everybody does. */
export const moderates = (state: ModerationState, userId: string): boolean =>
  state.everyoneModerates || state.moderatorIds.includes(userId)

const OPEN_SESSION = `
  MATCH (session:VideoCallSession)-[:CALL_IN]->(:Group { id: $groupId })
  WHERE session.endedAt IS NULL
  WITH session ORDER BY datetime(session.createdAt) DESC LIMIT 1
`

/** The moderation of the group's running call, or null while no session is open. */
export const readModeration = async (
  driver: Driver,
  groupId: string,
): Promise<ModerationState | null> => {
  const session = driver.session()
  try {
    const result = await session.readTransaction(async (transaction) =>
      transaction.run(
        `
          ${OPEN_SESSION}
          OPTIONAL MATCH (starter:User)-[started:STARTED_CALL]->(session)
          RETURN session.id AS sessionId,
                 starter.id AS starterId,
                 coalesce(started.handedOver, false) AS starterHandedOver,
                 coalesce(session.everyoneModerates, false) AS everyoneModerates,
                 [(user:User)-[:MODERATES_CALL]->(session) | user.id] AS moderatorIds,
                 [(user:User)-[:HAS_CALL_FLOOR]->(session) | user.id] AS speakerIds,
                 [(user:User)-[:LOST_CALL_MODERATION]->(session) | user.id] AS revokedIds,
                 [(user:User)-[:REMOVED_FROM_CALL]->(session) | user.id] AS removedIds
        `,
        { groupId },
      ),
    )
    const record = result.records[0]
    if (!record) {
      return null
    }
    return {
      sessionId: record.get('sessionId') as string,
      starterId: record.get('starterId') as string | null,
      starterHandedOver: record.get('starterHandedOver') === true,
      everyoneModerates: record.get('everyoneModerates') === true,
      moderatorIds: [...(record.get('moderatorIds') as string[])].sort(),
      speakerIds: [...(record.get('speakerIds') as string[])].sort(),
      revokedIds: [...(record.get('revokedIds') as string[])].sort(),
      removedIds: [...(record.get('removedIds') as string[])].sort(),
    }
  } finally {
    await session.close()
  }
}

const write = async (driver: Driver, query: string, variables: Record<string, unknown>) => {
  const session = driver.session()
  try {
    await session.writeTransaction(async (transaction) => transaction.run(query, variables))
  } finally {
    await session.close()
  }
}

/**
 * Makes the user a moderator, or not. Taking it away from somebody else is a revocation: they
 * cannot take it back themselves. Whoever gives it up, or has it taken, and started the call,
 * does not get it back on returning either.
 */
export const setModerator = async (
  driver: Driver,
  sessionId: string,
  userId: string,
  { moderator, revoked = false }: { moderator: boolean; revoked?: boolean },
) =>
  write(
    driver,
    moderator
      ? `
          MATCH (session:VideoCallSession { id: $sessionId })
          MATCH (user:User { id: $userId })
          MERGE (user)-[:MODERATES_CALL]->(session)
          WITH user, session
          OPTIONAL MATCH (user)-[revocation:LOST_CALL_MODERATION]->(session)
          DELETE revocation
        `
      : `
          MATCH (session:VideoCallSession { id: $sessionId })
          MATCH (user:User { id: $userId })
          OPTIONAL MATCH (user)-[moderation:MODERATES_CALL]->(session)
          DELETE moderation
          WITH user, session
          OPTIONAL MATCH (user)-[started:STARTED_CALL]->(session)
          SET started.handedOver = true
          FOREACH (_ IN CASE WHEN $revoked THEN [1] ELSE [] END |
            MERGE (user)-[:LOST_CALL_MODERATION]->(session)
          )
        `,
    { sessionId, userId, revoked },
  )

export const setEveryoneModerates = async (driver: Driver, sessionId: string, enabled: boolean) =>
  write(
    driver,
    `MATCH (session:VideoCallSession { id: $sessionId }) SET session.everyoneModerates = $enabled`,
    { sessionId, enabled },
  )

/** Gives the floor to exactly these users: whoever had it and is not among them loses it. */
export const setSpeakers = async (driver: Driver, sessionId: string, userIds: string[]) =>
  write(
    driver,
    `
      MATCH (session:VideoCallSession { id: $sessionId })
      OPTIONAL MATCH (:User)-[floor:HAS_CALL_FLOOR]->(session)
      DELETE floor
      WITH DISTINCT session
      UNWIND $userIds AS userId
      MATCH (user:User { id: userId })
      MERGE (user)-[:HAS_CALL_FLOOR]->(session)
    `,
    { sessionId, userIds },
  )

export const setSpeaker = async (
  driver: Driver,
  sessionId: string,
  userId: string,
  floor: boolean,
) =>
  write(
    driver,
    floor
      ? `
          MATCH (session:VideoCallSession { id: $sessionId })
          MATCH (user:User { id: $userId })
          MERGE (user)-[:HAS_CALL_FLOOR]->(session)
        `
      : `
          MATCH (:User { id: $userId })-[floor:HAS_CALL_FLOOR]->(:VideoCallSession { id: $sessionId })
          DELETE floor
        `,
    { sessionId, userId },
  )

/**
 * Notes the user as removed from the call: no join token for them while the session runs. Their
 * moderation and floor go, and so does their access to the call's chat — they are no longer
 * among those it is for.
 */
export const markRemoved = async (driver: Driver, sessionId: string, userId: string) =>
  write(
    driver,
    `
      MATCH (session:VideoCallSession { id: $sessionId })
      MATCH (user:User { id: $userId })
      MERGE (user)-[:REMOVED_FROM_CALL]->(session)
      WITH user, session
      OPTIONAL MATCH (user)-[edge:MODERATES_CALL|HAS_CALL_FLOOR]->(session)
      DELETE edge
      WITH DISTINCT user, session
      OPTIONAL MATCH (user)-[chatsIn:CHATS_IN]->(:Room)-[:ROOM_FOR]->(session)
      DELETE chatsIn
    `,
    { sessionId, userId },
  )

/**
 * The rights of these users in the group, as their role grants them — for telling who outranks
 * whom when nobody asks on their behalf (the hand-over). The owner role holds the whole catalog.
 */
const rolePermissionsOf = async (
  driver: Driver,
  groupId: string,
  userIds: string[],
): Promise<Map<string, Set<GroupPermissionKey>>> => {
  const session = driver.session()
  try {
    const result = await session.readTransaction(async (transaction) =>
      transaction.run(
        `
          MATCH (user:User)-[membership:MEMBER_OF]->(group:Group { id: $groupId })
          WHERE user.id IN $userIds
          OPTIONAL MATCH (group)-[:HAS_GROUP_ROLE]->(role:GroupRole { name: membership.role })
          RETURN user.id AS userId, membership.role AS roleName, role.permissions AS permissions
        `,
        { groupId, userIds },
      ),
    )
    const rights = new Map<string, Set<GroupPermissionKey>>()
    for (const record of result.records) {
      const roleName = record.get('roleName') as string
      let permissions: GroupPermissionKey[] = []
      if (roleName === OWNER_ROLE) {
        permissions = allGroupPermissionKeys()
      } else {
        try {
          permissions = JSON.parse(
            (record.get('permissions') as string | null) ?? '[]',
          ) as GroupPermissionKey[]
          // eslint-disable-next-line no-catch-all/no-catch-all
        } catch {
          // A malformed role grants nothing here, as everywhere else.
        }
      }
      rights.set(record.get('userId') as string, new Set(permissions))
    }
    return rights
  } finally {
    await session.close()
  }
}

/**
 * Whom the moderation goes to when it is handed on without a name: among those in the call, one
 * nobody else there outranks in the group; of those, whoever has been in the call longest.
 * `presentUserIds` comes in the order they joined. Null if there is nobody to give it to.
 */
export const successorOf = async (
  driver: Driver,
  groupId: string,
  presentUserIds: string[],
): Promise<string | null> => {
  const candidates = [...new Set(presentUserIds)]
  if (candidates.length === 0) {
    return null
  }
  const rights = await rolePermissionsOf(driver, groupId, candidates)
  const of = (userId: string) => rights.get(userId) ?? new Set<GroupPermissionKey>()
  // Outranking is a strict order, so among people it always leaves somebody nobody outranks.
  return candidates.find(
    (candidate) =>
      !candidates.some(
        (other) => other !== candidate && dominatesInGroup(of(other), of(candidate)),
      ),
  ) as string
}

/**
 * Makes sure the call has a moderator while somebody is in it.
 *
 * - Everybody moderates: nothing to do.
 * - Whoever started the call is back and never handed it on: they moderate again.
 * - A moderator is in the call: nothing to do.
 * - Otherwise the moderation goes to the successor (see successorOf), leaving out whoever had it
 *   taken away — unless nobody else is left.
 *
 * Returns the user who was made a moderator, or null.
 */
export const settleModeration = async (
  driver: Driver,
  groupId: string,
  presentUserIds: string[],
): Promise<string | null> => {
  const state = await readModeration(driver, groupId)
  if (!state || state.everyoneModerates) {
    return null
  }
  const present = presentUserIds.filter((userId) => !state.removedIds.includes(userId))
  if (
    state.starterId &&
    !state.starterHandedOver &&
    !state.revokedIds.includes(state.starterId) &&
    !state.moderatorIds.includes(state.starterId) &&
    present.includes(state.starterId)
  ) {
    await setModerator(driver, state.sessionId, state.starterId, { moderator: true })
    return state.starterId
  }
  if (present.some((userId) => state.moderatorIds.includes(userId))) {
    return null
  }
  const eligible = present.filter((userId) => !state.revokedIds.includes(userId))
  const successor = await successorOf(driver, groupId, eligible.length > 0 ? eligible : present)
  if (successor) {
    await setModerator(driver, state.sessionId, successor, { moderator: true })
  }
  return successor
}

// --- The media server's side ---------------------------------------------------------------

export interface Connection {
  identity: string
  userId: string | null
  /** `source` as the protocol numbers it (see SOURCE). */
  tracks: { sid: string; source: number; muted: boolean }[]
}

/** The connections in the room, in the order they joined, with what each publishes. */
export const listConnections = async (
  client: RoomServiceClient,
  roomName: string,
  userIdOf: (participant: { identity?: string; metadata?: string }) => string | null,
): Promise<Connection[]> => {
  const participants = await withTimeout(
    client.listParticipants(roomName),
    LIVEKIT_API_TIMEOUT_MS,
    'listParticipants',
  )
  return [...participants]
    .sort((a, b) => Number(a.joinedAt ?? 0) - Number(b.joinedAt ?? 0))
    .map((participant) => ({
      identity: participant.identity,
      userId: userIdOf(participant),
      tracks: participant.tracks.map((track) => ({
        sid: track.sid,
        source: track.source,
        muted: track.muted,
      })),
    }))
}

/** The users in the room, in the order they joined, each once. */
export const presentUsers = (connections: Connection[]): string[] => [
  ...new Set(connections.map(({ userId }) => userId).filter((id): id is string => !!id)),
]

// The protocol's values of TrackSource and DataPacket_Kind, spelled out rather than read from the
// SDK when this module loads: they are fixed by the wire protocol, and the specs that replace the
// SDK with a mock of their own need not bring its enums along.
const SOURCE = { CAMERA: 1, MICROPHONE: 2, SCREEN_SHARE: 3, SCREEN_SHARE_AUDIO: 4 } as const
const RELIABLE = 0 as unknown as DataPacketKind

/** Which published tracks a light act of moderation silences. */
export const SOURCES = {
  microphone: [SOURCE.MICROPHONE],
  camera: [SOURCE.CAMERA],
  screenShare: [SOURCE.SCREEN_SHARE, SOURCE.SCREEN_SHARE_AUDIO],
} as const

/**
 * Mutes what these connections publish from those sources. Unmuting is left to the person
 * themselves: nobody gets somebody else's microphone opened.
 */
export const muteTracks = async (
  client: RoomServiceClient,
  roomName: string,
  connections: Connection[],
  sources: readonly number[],
): Promise<void> => {
  await Promise.all(
    connections.flatMap((connection) =>
      connection.tracks
        .filter((track) => sources.includes(track.source) && !track.muted)
        .map(async (track) =>
          withTimeout(
            client.mutePublishedTrack(roomName, connection.identity, track.sid, true),
            LIVEKIT_API_TIMEOUT_MS,
            'mutePublishedTrack',
          ),
        ),
    ),
  )
}

export const removeConnections = async (
  client: RoomServiceClient,
  roomName: string,
  connections: Connection[],
): Promise<void> => {
  await Promise.all(
    connections.map(async (connection) =>
      withTimeout(
        client.removeParticipant(roomName, connection.identity),
        LIVEKIT_API_TIMEOUT_MS,
        'removeParticipant',
      ),
    ),
  )
}

/** What every participant reads from the room's metadata. */
export const moderationMetadata = (state: ModerationState | null) =>
  JSON.stringify({
    moderation: state
      ? {
          moderators: state.moderatorIds,
          everyone: state.everyoneModerates,
          speakers: state.speakerIds,
        }
      : null,
  })

/** Hands the current state to the media server, which passes it to every participant. */
export const publishModeration = async (
  client: RoomServiceClient,
  roomName: string,
  state: ModerationState | null,
): Promise<void> => {
  try {
    await withTimeout(
      client.updateRoomMetadata(roomName, moderationMetadata(state)),
      LIVEKIT_API_TIMEOUT_MS,
      'updateRoomMetadata',
    )
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err: unknown) {
    // The database holds the state; the next change publishes it again.
    logger.warn(`Publishing the moderation of ${roomName} failed:`, err)
  }
}

export type ModerationNoticeType =
  | 'microphoneMuted'
  | 'cameraOff'
  | 'screenShareStopped'
  | 'removed'
  | 'moderator'
  | 'moderationTakenOver'
  | 'moderationRevoked'
  | 'everyoneModerates'
  | 'everyoneModeratesOff'
  | 'floor'

export interface ModerationNotice {
  type: ModerationNoticeType
  /** Who did it, as the participants know them; absent where nobody did (an automatic hand-over). */
  by?: string
  /** For `moderator`: how it came about. */
  reason?: 'appointed' | 'handedOver' | 'automatic'
}

/** Tells these connections — or everybody, without any — what was done. */
export const notify = async (
  client: RoomServiceClient,
  roomName: string,
  notice: ModerationNotice,
  identities?: string[],
): Promise<void> => {
  if (identities?.length === 0) {
    return
  }
  try {
    await withTimeout(
      client.sendData(roomName, new TextEncoder().encode(JSON.stringify(notice)), RELIABLE, {
        topic: MODERATION_TOPIC,
        ...(identities ? { destinationIdentities: identities } : {}),
      }),
      LIVEKIT_API_TIMEOUT_MS,
      'sendData',
    )
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (err: unknown) {
    // A notice is a courtesy: what it tells has happened all the same.
    logger.warn(`A moderation notice in ${roomName} could not be sent:`, err)
  }
}

/** The identities of these users' connections. */
export const identitiesOf = (connections: Connection[], userIds: string[]): string[] =>
  connections
    .filter((connection) => connection.userId && userIds.includes(connection.userId))
    .map((connection) => connection.identity)
