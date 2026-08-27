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

describe('TestNode.update against a real node', () => {
  // The two cases that have to NOT be rejected. Here rather than in node.spec.ts, because
  // proving that a check stays quiet means letting the write happen — and node.spec.ts is
  // deliberately driverless, so a passing update there would hang on a session it never opens.

  it('accepts a partial patch, judging the node it produces', async () => {
    // `required` is a statement about the finished node. Validating `{ deleted: true }` on its
    // own would fail every entity in the registry, since a patch carries none of the required
    // properties — what is checked is the stored node with the patch applied.
    const node = await fixtures.first('User', { id: 'live' })
    await node.update({ deleted: true })
    expect(node.get('deleted')).toBe(true)
    expect(node.get('name')).toBe('Live')
  })

  it('refuses to report a write that never happened', async () => {
    // `MATCH ... WHERE id(n) = $id` finds nothing for a deleted node, `SET` never runs, and
    // Cypher calls the query a success. The handle then keeps its old values, so the failure
    // surfaces later on a field that looks stale for no reason — or not at all, on a database
    // that never got the write. relateTo already refuses this; update did not.
    //
    // Its own node, not one of the two the suite shares: this test destroys what it works on,
    // and the tests here are not ordered.
    const now = '2026-08-21T10:00:00.000Z'
    await run(
      `CREATE (:User {id: 'doomed', name: 'Doomed', slug: 'doomed', createdAt: $now,
                      updatedAt: $now})`,
      { now },
    )
    const node = await fixtures.first('User', { id: 'doomed' })
    await run(`MATCH (n:User {id: 'doomed'}) DETACH DELETE n`)
    await expect(node.update({ name: 'Renamed' })).rejects.toThrow('the node does not exist')
  })

  it('normalises a slug the same way the create path does', async () => {
    // `withDefaults` lowercased and slugified a caller's slug, and only the create path calls
    // it — so the same value was accepted and converted on the way in and refused on the way
    // through, for a pattern the declaration applies to both. What is validated is also what is
    // written: the query stores the normalised patch, not the raw one.
    const node = await fixtures.first('User', { id: 'live' })
    await node.update({ slug: 'Peter Pan' })
    expect(node.get('slug')).toBe('peter-pan')
  })

  it('tolerates an undeclared property the node already carries', async () => {
    // A legacy shape a migration spec writes on purpose. It is the audit's business, not this
    // caller's — rejecting it would fail an update for something the caller did not do.
    await run(`MATCH (n:User {id: 'gone'}) SET n.myRole = 'owner'`)
    const node = await fixtures.first('User', { id: 'gone' })
    await node.update({ name: 'Gone Away' })
    expect(node.get('name')).toBe('Gone Away')
    expect(node.get('myRole')).toBe('owner')
  })
})
