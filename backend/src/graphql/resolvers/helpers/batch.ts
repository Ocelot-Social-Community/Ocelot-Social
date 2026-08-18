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
  const session = context.driver.session()
  try {
    return await session.readTransaction(async (transaction) => {
      const result = await transaction.run(cypher, {
        ...params,
        ids,
        cypherParams: context.cypherParams ?? {},
      })
      const byId = new Map<unknown, unknown>()
      for (const record of result.records) byId.set(record.get('__id'), record.get('__value'))
      return { byId }
    })
  } finally {
    await session.close()
  }
}
