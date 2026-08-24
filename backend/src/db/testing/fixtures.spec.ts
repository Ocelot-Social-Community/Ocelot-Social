import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { fixtures } from './fixtures'

// Against a real database: what `first` matches is decided by Cypher, and the bug this pins
// was a query that looked right and asked for less than it was given.

const run = async (query: string, parameters: Record<string, unknown> = {}) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((transaction) => transaction.run(query, parameters))
  } finally {
    await session.close()
  }
}

beforeAll(async () => {
  await cleanDatabase()
  const now = '2026-08-21T10:00:00.000Z'
  await run(
    `CREATE (:User {id: 'live', name: 'Live', slug: 'live', deleted: false, about: 'here',
                    createdAt: $now, updatedAt: $now})
     CREATE (:User {id: 'gone', name: 'Gone', slug: 'gone', deleted: true,
                    createdAt: $now, updatedAt: $now})`,
    { now },
  )
})

afterAll(async () => {
  await cleanDatabase()
  await getDriver().close()
})

describe('fixtures.first', () => {
  it('matches on a single condition', async () => {
    expect((await fixtures.first('User', { id: 'gone' })).get('id')).toBe('gone')
  })

  it('requires EVERY condition, not just the first', async () => {
    // The bug: only `Object.entries(where)[0]` reached the query, so this returned the deleted
    // user and the spec asserted against a row that does not meet the condition it asked for.
    await expect(fixtures.first('User', { id: 'gone', deleted: false })).rejects.toThrow(
      'No User matching {"id":"gone","deleted":false}',
    )
  })

  it('still matches when every condition holds', async () => {
    const user = await fixtures.first('User', { id: 'gone', deleted: true, name: 'Gone' })
    expect(user.get('id')).toBe('gone')
  })

  it('takes an empty map as "any of them"', async () => {
    // Two specs use this shape (`first('File', {}, undefined)`), so it has to stay.
    expect((await fixtures.first('User', {})).get('id')).toEqual(expect.any(String))
  })

  it('reads a null condition as "has no such property"', async () => {
    // `node.about = $value` is never true for null in Cypher — the condition would silently
    // match nothing instead of the node that carries no `about`.
    expect((await fixtures.first('User', { about: null })).get('id')).toBe('gone')
  })

  it('names an undeclared property instead of reporting no match', async () => {
    await expect(fixtures.first('User', { slugg: 'live' })).rejects.toThrow(
      'User declares no property slugg',
    )
  })
})
