import DataLoader from 'dataloader'

import type { Driver } from 'neo4j-driver'

// Request-scoped batching for field resolvers.
//
// GraphQL calls sibling resolvers in parallel, so a list of N posts produces N calls to each
// of their field resolvers — N round trips for one logical question. A DataLoader collects
// the calls made within a tick and answers them with a single `UNWIND`-based statement.
//
// This file is pure infrastructure: it knows nothing about rooms, posts or users. The Cypher
// lives with the fields, in helpers/Resolver.ts and helpers/cypherField.ts, which register a
// loader per (type, field) through `forField` on first use. That way every migrated field
// batches without anyone hand-writing a loader for it.
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
// If subscription contexts are ever rebuilt per event, caching could be reconsidered — but
// it must not be switched on while a context can outlive a single resolution pass.
//
// One user's results cannot leak into another's: a context always belongs to exactly one
// viewer, and the loaders live and die with it.
//
// Loaders MUST return one entry per key, in key order — that is DataLoader's contract, and a
// Cypher result skips rows that match nothing. The batch functions therefore map by id and
// re-index against the key list rather than returning `result.records` directly.

/**
 * Builds the loader set for one context. Called from getContext; see the note above on why
 * these batch but do not cache.
 */
export const createLoaders = (_driver: Driver, _currentUserId: string | null) => {
  const fieldLoaders = new Map<string, DataLoader<string, unknown>>()

  return {
    /**
     * A per-field loader, created on first use and kept for the rest of this context.
     * `batch` must return one entry per key, in key order.
     */
    forField(key: string, batch: (ids: readonly string[]) => Promise<unknown[]>) {
      let loader = fieldLoaders.get(key)
      if (!loader) {
        loader = new DataLoader(batch, { cache: false })
        fieldLoaders.set(key, loader)
      }
      return loader
    },
  }
}

export type Loaders = ReturnType<typeof createLoaders>
