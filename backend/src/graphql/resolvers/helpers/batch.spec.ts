import { describe, expect, it } from 'vitest'

import { runBatch } from './batch'

import type { Context } from '@src/context'

// The reserved parameter names of runBatch.
//
// `ids` and `cypherParams` are appended after the caller's `params`, so passing either would
// have it replaced without a word. cypherField builds `params` from a field's GraphQL
// arguments, which means the names are not entirely this module's to choose — a field
// argument called `ids` would disappear here and be searched for in the Cypher.

const context = { driver: { session: () => ({}) } } as unknown as Context

// A driver double that records what actually reached the database. runBatch's contract is
// entirely about that boundary — which statement and which parameters go out, how the rows come
// back indexed, and whether the session is released — so the double exposes all three rather
// than just returning rows.
const makeContext = ({
  rows = [],
  cypherParams,
  failWith,
}: {
  rows?: Array<{ __id: unknown; __value: unknown }>
  cypherParams?: Record<string, unknown>
  failWith?: Error
} = {}) => {
  const calls: Array<{ cypher: string; params: Record<string, unknown> }> = []
  let closed = 0

  const session = {
    readTransaction: async (work: (transaction: unknown) => Promise<unknown>) =>
      work({
        // The `await` is deliberate rather than ceremonial: a real driver call resolves on a
        // later tick, and yielding one here means runBatch is exercised across that suspension
        // instead of running straight through as if the database were synchronous.
        run: async (cypher: string, params: Record<string, unknown>) => {
          calls.push({ cypher, params })
          await Promise.resolve()
          if (failWith) {
            throw failWith
          }
          return {
            records: rows.map((row) => ({
              get: (key: string) => row[key as '__id' | '__value'],
            })),
          }
        },
      }),
    close: async () => {
      await Promise.resolve()
      closed += 1
    },
  }

  const ctx = {
    driver: { session: () => session },
    ...(cypherParams === undefined ? {} : { cypherParams }),
  } as unknown as Context

  return { context: ctx, calls, closedCount: () => closed }
}

describe('runBatch reserved params', () => {
  it.each(['ids', 'cypherParams'])('rejects %s in params', async (reserved) => {
    await expect(
      runBatch({ context, cypher: 'RETURN 1', ids: ['a'], params: { [reserved]: 'x' } }),
    ).rejects.toThrow(`"${reserved}" is reserved`)
  })

  it('rejects before opening a session', async () => {
    // Thrown while validating, not from inside the transaction — otherwise the guard would
    // leak a session on every rejection.
    let opened = 0
    const counting = {
      driver: {
        session: () => {
          opened += 1
          return {}
        },
      },
    } as unknown as Context

    await expect(
      runBatch({ context: counting, cypher: 'RETURN 1', ids: ['a'], params: { ids: ['b'] } }),
    ).rejects.toThrow()
    expect(opened).toBe(0)
  })
})

describe('runBatch statement', () => {
  // The deduplication is the reason this helper exists in the shape it does, and it is the one
  // behaviour a caller cannot observe from its own result: callers index against the FULL id
  // list either way, so a regression here stays invisible to them and only shows up as a query
  // walking the same pattern N times. The module comment measures it at "10 ids / 1 distinct"
  // on a 10-post feed — that is exactly the case pinned here.
  it('sends each id once, however often it was requested', async () => {
    const { context: ctx, calls } = makeContext()

    await runBatch({
      context: ctx,
      cypher: 'UNWIND $ids AS id RETURN id AS __id, true AS __value',
      ids: Array.from({ length: 10 }, () => 'same-author'),
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].params.ids).toEqual(['same-author'])
  })

  // Order matters to the callers: DataLoader wants one entry per key IN KEY ORDER, and the
  // dedup must not reshuffle what survives it.
  it('keeps first-seen order of the distinct ids', async () => {
    const { context: ctx, calls } = makeContext()

    await runBatch({ context: ctx, cypher: 'RETURN 1', ids: ['b', 'a', 'b', 'c', 'a'] })

    expect(calls[0].params.ids).toEqual(['b', 'a', 'c'])
  })

  it('passes the caller params through alongside the reserved ones', async () => {
    const { context: ctx, calls } = makeContext({ cypherParams: { currentUserId: 'u1' } })

    await runBatch({
      context: ctx,
      cypher: 'RETURN 1',
      ids: ['a'],
      params: { first: 10, orderBy: 'createdAt_desc' },
    })

    expect(calls[0].params).toEqual({
      first: 10,
      orderBy: 'createdAt_desc',
      ids: ['a'],
      cypherParams: { currentUserId: 'u1' },
    })
  })

  // Statements lifted from the old @cypher directives reference `$cypherParams.currentUserId`,
  // and Cypher rejects a parameter that is MISSING — not one that is merely empty. An
  // unauthenticated request has no cypherParams on the context, so the fallback is what keeps
  // those statements runnable rather than failing at the driver.
  it('substitutes an empty object when the context carries no cypherParams', async () => {
    const { context: ctx, calls } = makeContext()

    await runBatch({ context: ctx, cypher: 'RETURN $cypherParams.currentUserId', ids: ['a'] })

    expect(calls[0].params.cypherParams).toEqual({})
  })
})

describe('runBatch result indexing', () => {
  it('indexes __value by __id', async () => {
    const { context: ctx } = makeContext({
      rows: [
        { __id: 'p1', __value: 3 },
        { __id: 'p2', __value: 0 },
      ],
    })

    const { byId } = await runBatch({ context: ctx, cypher: 'RETURN 1', ids: ['p1', 'p2'] })

    expect(byId.get('p1')).toBe(3)
    expect(byId.get('p2')).toBe(0)
  })

  // A miss has to be distinguishable from a stored `undefined`, because the callers each apply
  // their own fallback (one returns booleans, one counts, one unwraps Bolt values) and they key
  // that decision off the absence of the entry.
  it('omits ids the statement returned no row for', async () => {
    const { context: ctx } = makeContext({ rows: [{ __id: 'p1', __value: 1 }] })

    const { byId } = await runBatch({ context: ctx, cypher: 'RETURN 1', ids: ['p1', 'missing'] })

    expect(byId.has('missing')).toBe(false)
    expect(byId.size).toBe(1)
  })
})

describe('runBatch session lifecycle', () => {
  it('closes the session after a successful read', async () => {
    const { context: ctx, closedCount } = makeContext({ rows: [{ __id: 'a', __value: 1 }] })

    await runBatch({ context: ctx, cypher: 'RETURN 1', ids: ['a'] })

    expect(closedCount()).toBe(1)
  })

  // The `finally` is the whole point of the block: a statement that throws — a syntax error, a
  // transaction timeout — must not leak the session, or a handful of failing requests exhausts
  // the driver's pool and takes down every subsequent query rather than just its own.
  it('closes the session when the statement throws, and propagates the error', async () => {
    const boom = new Error('Neo.ClientError.Statement.SyntaxError')
    const { context: ctx, closedCount } = makeContext({ failWith: boom })

    await expect(runBatch({ context: ctx, cypher: 'RETURN 1', ids: ['a'] })).rejects.toThrow(boom)
    expect(closedCount()).toBe(1)
  })
})
