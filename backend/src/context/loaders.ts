import DataLoader from 'dataloader'

import type { Driver } from 'neo4j-driver'

// Request-scoped batching for field resolvers.
//
// GraphQL calls sibling resolvers in parallel, so a list of N rooms produces N calls to
// Room.unreadCount — N round trips for one logical question. A DataLoader collects the
// calls made within a tick and answers them with a single `UNWIND`-based Cypher statement.
//
// CACHING IS OFF, deliberately — batching is the part we want, memoisation is not safe here.
//
// A context is NOT always short-lived. For HTTP it lasts one request, but a subscription
// context is built once per operation (graphql-ws) or even once per connection
// (SubscriptionServer.onConnect, still wired up in server.ts for the legacy protocol) and
// then serves every pushed event for as long as the client stays connected. A memoising
// loader would answer `roomUpdated { unreadCount }` with the value from the first push
// forever — and unreadCount is exactly what the webapp selects there
// (webapp/graphql/Rooms.js). `cache: false` keeps the N+1 fix (calls made in the same tick
// are still coalesced into one query) while guaranteeing every tick reads current state.
//
// If subscription contexts are ever rebuilt per event, caching could be reconsidered —
// but it must not be switched on while a context can outlive a single resolution pass.
//
// One user's results still cannot leak into another's: the loaders close over the viewer's
// id, and a context always belongs to exactly one viewer.
//
// Loaders MUST return one entry per key, in key order — that is DataLoader's contract, and
// a Cypher result skips rows that match nothing. Hence the map-then-remap pattern below;
// returning `result.records` directly would silently misalign counts with rooms.

/** Bolt integers arrive as {low, high}; count aggregates are always small enough for Number. */
const toNumber = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber()
  }
  return Number(value) || 0
}

/**
 * Unread messages per room for the current user, excluding blocked and muted senders.
 *
 * Replaces one query per room (rooms.ts getRoomUnreadCountForUser) with one query per
 * request. Anonymous viewers get zeros without touching the database.
 */
const roomUnreadCountLoader = (driver: Driver, currentUserId: string | null) =>
  new DataLoader<string, number>(
    async (roomIds) => {
      if (!currentUserId) return roomIds.map(() => 0)

      const session = driver.session()
      try {
        const result = await session.readTransaction((transaction) =>
          transaction.run(
            `
              UNWIND $roomIds AS roomId
              OPTIONAL MATCH (u:User { id: $userId })-[:HAS_NOT_SEEN]->(message:Message)-[:INSIDE]->(room:Room { id: roomId })
              MATCH (message)<-[:CREATED]-(sender:User)
              WHERE NOT (u)-[:BLOCKED]->(sender) AND NOT (u)-[:MUTED]->(sender)
              RETURN roomId, count(DISTINCT message) AS unreadCount
            `,
            { roomIds, userId: currentUserId },
          ),
        )

        const counts = new Map<string, number>(
          result.records.map((record) => [
            record.get('roomId') as string,
            toNumber(record.get('unreadCount')),
          ]),
        )
        // Rooms with no unread messages produce no row at all — default them to 0 rather
        // than letting DataLoader see a short array.
        return roomIds.map((roomId) => counts.get(roomId) ?? 0)
      } finally {
        await session.close()
      }
    },
    // See the note at the top of this file: batching yes, memoisation no.
    { cache: false },
  )

/**
 * Builds the loader set for one context. Called from getContext; see the note above on why
 * these batch but do not cache.
 */
export const createLoaders = (driver: Driver, currentUserId: string | null) => ({
  roomUnreadCount: roomUnreadCountLoader(driver, currentUserId),
})

export type Loaders = ReturnType<typeof createLoaders>
