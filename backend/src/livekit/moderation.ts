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

import { TwirpError } from 'livekit-server-sdk'

import { allGroupPermissionKeys } from '@src/groupPermission'
import { dominatesInGroup } from '@src/groupRole/authority'
import { parseStoredPermissions } from '@src/groupRole/storedPermissions'
import { OWNER_ROLE } from '@src/groupRole/types'
import { clientKeyOf } from '@src/livekit/rooms'
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
  /** The id of the media-server room the session runs in; it tells this call from the next. */
  livekitSid: string | null
  starterId: string | null
  starterHandedOver: boolean
  moderatorIds: string[]
  everyoneModerates: boolean
  speakerIds: string[]
  revokedIds: string[]
  removedIds: string[]
  /**
   * Counts every change of who moderates or lost it (setModerator), so a write can tell whether
   * anything changed since this state was read — also a change that was undone again.
   */
  revision: number
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
                 session.livekitSid AS livekitSid,
                 starter.id AS starterId,
                 coalesce(started.handedOver, false) AS starterHandedOver,
                 coalesce(session.everyoneModerates, false) AS everyoneModerates,
                 [(user:User)-[:MODERATES_CALL]->(session) | user.id] AS moderatorIds,
                 [(user:User)-[:HAS_CALL_FLOOR]->(session) | user.id] AS speakerIds,
                 [(user:User)-[:LOST_CALL_MODERATION]->(session) | user.id] AS revokedIds,
                 [(user:User)-[:REMOVED_FROM_CALL]->(session) | user.id] AS removedIds,
                 coalesce(session.moderationRevision, 0) AS revision
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
      livekitSid: record.get('livekitSid') as string | null,
      starterId: record.get('starterId') as string | null,
      starterHandedOver: record.get('starterHandedOver') === true,
      everyoneModerates: record.get('everyoneModerates') === true,
      moderatorIds: [...(record.get('moderatorIds') as string[])].sort(),
      speakerIds: [...(record.get('speakerIds') as string[])].sort(),
      revokedIds: [...(record.get('revokedIds') as string[])].sort(),
      removedIds: [...(record.get('removedIds') as string[])].sort(),
      revision: Number(record.get('revision')),
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
 *
 * Making somebody a moderator whose moderation was taken away gives it back only with `restore`:
 * whether it was taken is asked when writing, not of a state read before. A revocation made
 * meanwhile then holds, also against an appointment decided on the earlier state. Returns
 * whether the user moderates now (for taking it away: always true).
 *
 * `restore: true` is for whoever may give it back in any case. `restore: { unchangedSince }`
 * gives it back only if the moderation has not changed since the state of that `revision` was
 * read — for a decision that holds only for that state (see settleModeration).
 */
export const setModerator = async (
  driver: Driver,
  sessionId: string,
  userId: string,
  {
    moderator,
    revoked = false,
    restore = false,
  }: {
    moderator: boolean
    revoked?: boolean
    restore?: boolean | { unchangedSince: number }
  },
): Promise<boolean> => {
  const session = driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      // The group's lock, as joining the call's chat and removing somebody take it: giving and
      // taking the moderation happen one after the other, so the check below sees a
      // revocation made before it. A statement of its own, so the lock is surely held first.
      await transaction.run(
        `
          MATCH (:VideoCallSession { id: $sessionId })-[:CALL_IN]->(group:Group)
          SET group.callSessionLock = true
          REMOVE group.callSessionLock
        `,
        { sessionId },
      )
      if (!moderator) {
        await transaction.run(
          `
            MATCH (session:VideoCallSession { id: $sessionId })
            MATCH (user:User { id: $userId })
            SET session.moderationRevision = coalesce(session.moderationRevision, 0) + 1
            WITH user, session
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
        return true
      }
      const appointed = await transaction.run(
        `
          MATCH (session:VideoCallSession { id: $sessionId })
          MATCH (user:User { id: $userId })
          // Removed from the call meanwhile: no moderator, whatever else holds.
          WHERE NOT (user)-[:REMOVED_FROM_CALL]->(session)
            AND ($restore = true
              OR NOT (user)-[:LOST_CALL_MODERATION]->(session)
              OR coalesce(session.moderationRevision, 0) = $unchangedSince)
          MERGE (user)-[:MODERATES_CALL]->(session)
          WITH user, session
          OPTIONAL MATCH (user)-[revocation:LOST_CALL_MODERATION]->(session)
          DELETE revocation
          WITH DISTINCT user, session
          SET session.moderationRevision = coalesce(session.moderationRevision, 0) + 1
          RETURN count(user) AS appointed
        `,
        {
          sessionId,
          userId,
          restore: restore === true,
          // No revision is negative: without one, this never matches.
          unchangedSince: typeof restore === 'object' ? restore.unchangedSince : -1,
        },
      )
      return Number(appointed.records[0].get('appointed')) > 0
    })
  } finally {
    await session.close()
  }
}

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
      // The group's lock, as joining the call's chat takes it (see joinCallSession): a join
      // asked for before the removal cannot let them back into the chat after it.
      MATCH (read:VideoCallSession { id: $sessionId })-[:CALL_IN]->(group:Group)
      SET group.callSessionLock = true
      REMOVE group.callSessionLock
      // A new chat may have started in the same media-server room since the session was read
      // (see joinCallSession). It is the same call, so the removal goes to that session too —
      // where it was written to the ended one alone, the new chat would let them back in.
      WITH read, group
      OPTIONAL MATCH (current:VideoCallSession)-[:CALL_IN]->(group)
        WHERE current.endedAt IS NULL AND current.livekitSid = read.livekitSid
          AND current <> read
      WITH [read] + collect(current) AS sessions
      UNWIND sessions AS session
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
      // Read as every other path reads a role: a malformed list grants nothing, and keys the
      // catalog does not know count for nothing — they would only make ranks incomparable.
      const permissions =
        roleName === OWNER_ROLE
          ? allGroupPermissionKeys()
          : parseStoredPermissions(record.get('permissions') as string | null)
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
    // Had it taken away meanwhile: nothing now (see below).
    const restored = await setModerator(driver, state.sessionId, state.starterId, {
      moderator: true,
    })
    return restored ? state.starterId : null
  }
  if (present.some((userId) => state.moderatorIds.includes(userId))) {
    return null
  }
  const eligible = present.filter((userId) => !state.revokedIds.includes(userId))
  const successor = await successorOf(driver, groupId, eligible.length > 0 ? eligible : present)
  if (!successor) {
    return null
  }
  // Somebody it was taken from gets it back only when nobody else is left — as far as this state
  // knows: so only while the moderation is as it was read. Given back and taken again meanwhile,
  // somebody else moderated in between, who may still be there.
  const appointed = await setModerator(driver, state.sessionId, successor, {
    moderator: true,
    restore: eligible.length === 0 ? { unchangedSince: state.revision } : false,
  })
  // Refused because the moderation changed meanwhile: not tried again on the participants given,
  // who may be out of date by now. The next settling asks the media server afresh — the poller
  // does on every poll of a room with people in it, and every act of moderation settles.
  return appointed ? successor : null
}

// --- The media server's side ---------------------------------------------------------------

export interface Connection {
  identity: string
  userId: string | null
  /** When it joined, in milliseconds; 0 where the media server does not say. */
  joinedAtMs?: number
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
  // In milliseconds where the media server says so: two joins of one tab can fall into the
  // same second, and which of them is the newer decides which one stays (supersededConnections).
  const joinedAtMs = (participant: { joinedAt?: bigint; joinedAtMs?: bigint }) =>
    Number(participant.joinedAtMs ?? 0) || Number(participant.joinedAt ?? 0) * 1000
  return [...participants]
    .sort((a, b) => joinedAtMs(a) - joinedAtMs(b))
    .map((participant) => ({
      identity: participant.identity,
      userId: userIdOf(participant),
      joinedAtMs: joinedAtMs(participant),
      tracks: participant.tracks.map((track) => ({
        sid: track.sid,
        source: track.source,
        muted: track.muted,
      })),
    }))
}

/**
 * The connections a newer one from the same browser tab has replaced, of connections in the order
 * they joined. A tab is in a call once: an older connection of it is one it did not end — left by
 * a failed join, a crashed page, a reload — and would stay as a second self, silent, for as long
 * as the tab keeps it open. The user's other tabs and devices are never among them, nor are
 * connections without a tab id (clientKeyOf).
 *
 * Only one that joined before the newest is superseded: of two whose join times are the same —
 * a media server that tells whole seconds only — which is the newer cannot be said, so both stay
 * until a later look tells them apart, or the older one leaves on its own.
 */
export const supersededConnections = (connections: Connection[]): Connection[] => {
  const newest = new Map<string, Connection>()
  for (const connection of connections) {
    const key = clientKeyOf(connection.identity)
    if (key) {
      newest.set(key, connection)
    }
  }
  return connections.filter((connection) => {
    const key = clientKeyOf(connection.identity)
    const kept = key !== null ? newest.get(key) : undefined
    return (
      kept !== undefined &&
      kept !== connection &&
      (connection.joinedAtMs ?? 0) < (kept.joinedAtMs ?? 0)
    )
  })
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
 *
 * Every track is tried on its own: one that fails does not hold back the others, nor what is
 * done after them. A track can be gone since the connections were listed — a client switching
 * DTX publishes its microphone anew, under another SID (#10792). Whoever it belongs to is told
 * all the same (see notify), and their client then switches it off itself.
 */
export const muteTracks = async (
  client: RoomServiceClient,
  roomName: string,
  connections: Connection[],
  sources: readonly number[],
): Promise<void> => {
  const results = await Promise.allSettled(
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
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.warn(`A track in ${roomName} could not be muted:`, result.reason)
    }
  }
}

// A connection the media server no longer knows: gone already.
const isGone = (err: unknown) =>
  err instanceof TwirpError && (err.status === 404 || err.code === 'not_found')

/**
 * Takes these connections out of the room, each on its own: one that cannot be removed does not
 * keep the others in, nor fail the act it is part of. One already gone is what was wanted.
 */
export const removeConnections = async (
  client: RoomServiceClient,
  roomName: string,
  connections: Connection[],
): Promise<void> => {
  const results = await Promise.allSettled(
    connections.map(async (connection) =>
      withTimeout(
        client.removeParticipant(roomName, connection.identity),
        LIVEKIT_API_TIMEOUT_MS,
        'removeParticipant',
      ),
    ),
  )
  for (const result of results) {
    if (result.status === 'rejected' && !isGone(result.reason)) {
      logger.warn(`A connection in ${roomName} could not be removed:`, result.reason)
    }
  }
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
  /** Done by the user themselves, for their other devices: their buttons follow, nothing told. */
  self?: true
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
