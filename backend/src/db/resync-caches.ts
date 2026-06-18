import CONFIG from '@config/index'

// Hard deadline for the best-effort nudge so a half-open / unresponsive endpoint can't
// hang the seed/reset CLI flow. On timeout the fetch rejects (AbortError) and is caught
// below as "no reachable server" — the next server boot reads the fresh DB anyway.
const RESYNC_TIMEOUT = 3000

// Best-effort: nudge an ALREADY-RUNNING server to resync its in-memory role/policy
// caches from the (just reset/seeded) DB. A separate CLI/test process wipes the DB but
// cannot clear the server's caches directly, so we call the resyncCaches mutation over
// HTTP. Outside production that mutation needs no auth (handy right after a wipe, when
// no users exist). Quietly no-ops if no server is reachable — a fresh boot reads the
// up-to-date DB anyway. Never throws: a missing/unreachable server must not fail the
// reset/seed.
export async function nudgeCacheResync(): Promise<void> {
  const uri = CONFIG.GRAPHQL_URI
  if (!uri) return
  try {
    const response = await fetch(uri, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'mutation { resyncCaches }' }),
      signal: AbortSignal.timeout(RESYNC_TIMEOUT),
    })
    const body = (await response.json()) as { data?: { resyncCaches?: boolean } }
    if (body?.data?.resyncCaches) {
      // eslint-disable-next-line no-console
      console.log('Resynced the running server’s role/policy caches from the database.')
    }
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch {
    // No running server reached, or it did not respond within RESYNC_TIMEOUT (down /
    // half-open) — fine, it reads the fresh DB on its next boot.
  }
}
