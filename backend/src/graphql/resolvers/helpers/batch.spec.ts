import { runBatch } from './batch'

import type { Context } from '@src/context'

// The reserved parameter names of runBatch.
//
// `ids` and `cypherParams` are appended after the caller's `params`, so passing either would
// have it replaced without a word. cypherField builds `params` from a field's GraphQL
// arguments, which means the names are not entirely this module's to choose — a field
// argument called `ids` would disappear here and be searched for in the Cypher.

const context = { driver: { session: () => ({}) } } as unknown as Context

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
