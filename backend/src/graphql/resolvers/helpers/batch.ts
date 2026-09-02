import type { Context } from '@src/context'

/**
 * Runs one `UNWIND $ids`-style statement and indexes its rows by `__id`.
 *
 * The single place where a batched field resolver talks to the database. It was written out
 * three times — in helpers/Resolver.ts, in helpers/cypherField.ts and in Post.comments — with
 * the same shape each time: open a session, read in a transaction, collect `__id`/`__value`
 * into a map, close the session in `finally`. Everything that would ever need changing about
 * that lives in those four lines: a transaction timeout, the move from `readTransaction` to
 * `executeRead` when the driver goes to 5.x, deduplicating keys, instrumentation. Three
 * copies means three chances to change two of them.
 *
 * Callers keep their own post-processing, because that is where they genuinely differ: one
 * returns booleans, one counts, one unwraps Bolt values and applies a fallback.
 *
 * `cypherParams` is always passed along. Statements lifted from the old @cypher directives
 * reference `$cypherParams.currentUserId`, and Cypher only objects to parameters that are
 * MISSING, never to ones it does not use.
 */
export const runBatch = async ({
  context,
  cypher,
  ids,
  params = {},
}: {
  context: Context
  cypher: string
  ids: readonly string[]
  params?: Record<string, unknown>
}): Promise<{ byId: Map<unknown, unknown> }> => {
  // Deduplicated before the statement runs, NOT after.
  //
  // `cache: false` on the loaders (see context/loaders.ts, where the reason is spelled out)
  // switches off DataLoader's per-batch deduplication along with its memoisation, so the same
  // key arrives once per `.load()` call. That is the normal case, not a corner case: a feed of
  // 30 posts by one author asks `User.followedByCurrentUser` 30 times for that one author, and
  // `UNWIND` would walk the identical pattern 30 times. Measured at 10 ids / 1 distinct on a
  // 10-post feed.
  //
  // Callers still index the result against the FULL `ids` list, so DataLoader keeps getting
  // one entry per key, in key order — the map lookup does not care that the query saw fewer.
  const distinctIds = [...new Set(ids)]

  // `ids` and `cypherParams` belong to this helper and are appended AFTER the caller's
  // params, so a caller passing either name would have it silently replaced. cypherField
  // fills `params` from a field's GraphQL ARGUMENTS, so the names are not fully under this
  // module's control — a field argument called `ids` would vanish here, and the search for
  // it would start in the Cypher. No such argument exists today; this keeps it that way, and
  // says so at the point where the collision would happen.
  for (const reserved of ['ids', 'cypherParams']) {
    if (reserved in params) {
      throw new Error(`runBatch: "${reserved}" is reserved and cannot be passed in params.`)
    }
  }

  const session = context.driver.session()
  try {
    return await session.readTransaction(async (transaction) => {
      const result = await transaction.run(cypher, {
        ...params,
        ids: distinctIds,
        cypherParams: context.cypherParams ?? {},
      })
      const byId = new Map<unknown, unknown>()
      for (const record of result.records) {
        byId.set(record.get('__id'), record.get('__value'))
      }
      return { byId }
    })
  } finally {
    await session.close()
  }
}
