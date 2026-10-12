/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// The database's side of a video call.
//
// The call itself runs on the media server and leaves no trace. What is kept here is one
// VideoCallSession per call, and with it the conference chat: a Room that points at the session
// (ROOM_FOR) and that only those who joined the call chat in (CHATS_IN). Everything the chat
// does — history, attachments, unread marks, live delivery — is the ordinary Room/Message
// machinery, which decides access on that one edge. So a message in it reaches the
// participants of the call and nobody else, which is the whole point: the group's own chat
// notifies every member, in the call or not.
//
// Which call is which is the media server's knowledge: every call of a group runs in a room
// of the same name, but each room it opens gets an id of its own (the sid). A session is that
// sid's, so two people in the same room always land in the same chat, and a room opened anew
// always starts a new one — no guessing from clocks or participant counts.
//
// When a call ends, the media server does not always tell: its webhook may be unreachable, and
// the backend may have been down when the last participant left. So a session is ended when
// the room is reported finished (webhook), when the room is gone from the server's list
// (poller), and — the one that cannot be missed — when the group's next call begins and finds
// an earlier session still marked as running.

import type { Driver } from 'neo4j-driver'

interface JoinCallSessionInput {
  groupId: string
  userId: string
  /** The name of the media-server room the call runs in. */
  livekitRoom: string
  /** The id the media server gave this very room; it tells this call from the next. */
  livekitSid: string
}

/**
 * Makes the user a participant of the call running in that media-server room, opening its
 * session if this is the first to ask, and returns the id of its conference chat room — or
 * null if the group is gone. Every other session of the group still marked as running is over
 * by definition (a group has one call at a time) and is ended on the way.
 */
export const joinCallSession = async (
  driver: Driver,
  { groupId, userId, livekitRoom, livekitSid }: JoinCallSessionInput,
): Promise<string | null> => {
  const session = driver.session()
  try {
    return await session.writeTransaction(async (transaction) => {
      // The lock makes "is there a session for this room, else open one" a single step. Two
      // participants asking at the same moment would otherwise both find none and both create
      // one. It is held until the transaction ends.
      const group = await transaction.run(
        `
          MATCH (group:Group { id: $groupId })
          CALL apoc.lock.nodes([group])
          OPTIONAL MATCH (leftover:VideoCallSession)-[:CALL_IN]->(group)
            WHERE leftover.endedAt IS NULL AND leftover.livekitSid <> $livekitSid
          SET leftover.endedAt = toString(datetime())
          // The group is returned so that a group that is gone yields no row at all — an
          // aggregate on its own would report "none ended" for it.
          RETURN group.id AS groupId, count(leftover) AS ended
        `,
        { groupId, livekitSid },
      )
      if (group.records.length === 0) {
        return null
      }
      const joined = await transaction.run(
        `
          MATCH (group:Group { id: $groupId })
          MATCH (user:User { id: $userId })
          MERGE (session:VideoCallSession { livekitSid: $livekitSid })
          ON CREATE SET
            session.id = apoc.create.uuid(),
            session.livekitRoom = $livekitRoom,
            session.createdAt = toString(datetime())
          MERGE (session)-[:CALL_IN]->(group)
          MERGE (room:Room)-[:ROOM_FOR]->(session)
          ON CREATE SET
            room.id = apoc.create.uuid(),
            room.createdAt = toString(datetime())
          MERGE (user)-[:CHATS_IN]->(room)
          RETURN room.id AS roomId
        `,
        { groupId, userId, livekitRoom, livekitSid },
      )
      return (joined.records[0]?.get('roomId') as string | undefined) ?? null
    })
  } finally {
    await session.close()
  }
}

/**
 * Marks the session of that media-server room as over, which makes its chat read-only.
 * By sid, so a report about one call can never end the next one in a room of the same name.
 */
export const endCallSession = async (driver: Driver, livekitSid: string): Promise<void> => {
  const session = driver.session()
  try {
    await session.writeTransaction(async (transaction) =>
      transaction.run(
        `
          MATCH (session:VideoCallSession { livekitSid: $livekitSid })
          WHERE session.endedAt IS NULL
          SET session.endedAt = toString(datetime())
        `,
        { livekitSid },
      ),
    )
  } finally {
    await session.close()
  }
}

// A room missing from the media server's list says nothing about a session opened after the
// list was taken — that one belongs to the room opened since. This is how long a session is
// left alone for that reason: longer than a listing can take to arrive.
export const MISSING_ROOM_GRACE_SECONDS = 30

/**
 * Marks the sessions running under that room NAME as over — for the case where all that is
 * known is that no such room exists any more, and its sid with it. Sessions only just opened
 * are spared (see MISSING_ROOM_GRACE_SECONDS); should one of those really be over, it is
 * ended when the group's next call begins.
 */
export const endCallSessionsOfMissingRoom = async (
  driver: Driver,
  livekitRoom: string,
): Promise<void> => {
  const session = driver.session()
  try {
    await session.writeTransaction(async (transaction) =>
      transaction.run(
        `
          MATCH (session:VideoCallSession { livekitRoom: $livekitRoom })
          WHERE session.endedAt IS NULL
            // Compared as datetimes, not as the stored strings: toString(datetime()) drops
            // trailing zeros of the fraction, so the strings do not sort chronologically.
            AND datetime(session.createdAt) <= datetime() - duration({ seconds: $graceSeconds })
          SET session.endedAt = toString(datetime())
        `,
        { livekitRoom, graceSeconds: MISSING_ROOM_GRACE_SECONDS },
      ),
    )
  } finally {
    await session.close()
  }
}

/**
 * Takes the user out of every conference chat of that group's calls. Leaving a group ends the
 * access to what was written in its calls, as it ends the access to the group's chat.
 */
export const removeUserFromGroupCallRooms = async (
  transaction,
  groupId: string,
  userId: string,
) => {
  await transaction.run(
    `
      MATCH (:User { id: $userId })-[chatsIn:CHATS_IN]->(:Room)
        -[:ROOM_FOR]->(:VideoCallSession)-[:CALL_IN]->(:Group { id: $groupId })
      DELETE chatsIn
    `,
    { groupId, userId },
  )
}
