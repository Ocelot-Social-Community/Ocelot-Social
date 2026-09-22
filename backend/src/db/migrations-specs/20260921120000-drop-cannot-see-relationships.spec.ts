import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { deleteBatch, up, down } from '@db/migrations/20260921120000-drop-cannot-see-relationships'
import { getDriver } from '@db/neo4j'

// Against a REAL Neo4j, unlike the other two migration specs in here, and deliberately so.
//
// Everything this migration can get wrong is a property of the database, not of the code
// around it. It failed in CI on `LIMIT $batchSize`, because the driver sends a plain JS number
// as a Cypher Float and LIMIT takes only an integer — and it would have failed just as quietly
// the other way round, since `count()` comes back as a Neo4j Integer that is not `> 0` against
// a JS number, which ends the loop after one batch and leaves the rest of the edges behind.
// A mocked session accepts any query text and returns any shape, so it certifies both bugs as
// fine. Only the real planner and the real driver can say otherwise.
//
// NOT beside its subject: node-migrate loads every entry of --migrations-dir, so a spec left
// in there kills `db:migrate up` in the init container. See the sibling specs.

const driver = getDriver()

/**
 * `edgeCount` CANNOT_SEE relationships, spread over a handful of users and posts.
 *
 * Starts from `cleanDatabase()` — the same helper the other 81 database-backed specs use —
 * rather than a hand-written DELETE. Two reasons, and the second is the load-bearing one:
 * this suite shares one Neo4j and a bespoke cleanup is a second, divergent answer to a
 * question that is already answered; and the assertions below count restrictions across the
 * WHOLE graph, so a leftover CANNOT_SEE edge from anywhere else would make `deleteBatch`
 * return more than the fixture put in. Scoping the cleanup to this fixture's own nodes would
 * leave exactly that hole open.
 *
 * `cleanDatabase()` preserves `Migration` nodes by design, which matters here more than
 * anywhere else: they are node-migrate's bookkeeping, and wiping them would tell the runner
 * to replay every migration.
 */
const givenRestrictions = async (edgeCount: number) => {
  await cleanDatabase()
  const session = driver.session()
  try {
    await session.writeTransaction((transaction) =>
      transaction.run(
        `
          UNWIND range(1, $edgeCount) AS i
          MERGE (u:User {id: 'cs-user-' + toString(i % 4)})
          MERGE (p:Post {id: 'cs-post-' + toString(i)})
          CREATE (u)-[:CANNOT_SEE]->(p)
        `,
        { edgeCount },
      ),
    )
  } finally {
    await session.close()
  }
}

const remainingRestrictions = async (): Promise<number> => {
  const session = driver.session()
  try {
    const result = await session.readTransaction((transaction) =>
      transaction.run('MATCH ()-[restriction:CANNOT_SEE]->() RETURN count(restriction) AS total'),
    )
    return (result.records[0].get('total') as { toNumber: () => number }).toNumber()
  } finally {
    await session.close()
  }
}

afterAll(async () => {
  await cleanDatabase()
})

describe(deleteBatch, () => {
  beforeEach(async () => {
    await givenRestrictions(7)
  })

  it('deletes a batch and reports the count as a plain number', async () => {
    const session = driver.session()
    try {
      const deleted = await deleteBatch(session, 3)

      // `toBe(3)` and not `toEqual`: a Neo4j Integer is deeply equal to nothing useful, and a
      // strict comparison against a primitive is exactly what the `up` loop performs.
      expect(deleted).toBe(3)
      expect(typeof deleted).toBe('number')
    } finally {
      await session.close()
    }
  })

  it('reports 0 once nothing is left, which is what stops the loop', async () => {
    const session = driver.session()
    try {
      await deleteBatch(session, 100)

      expect(await deleteBatch(session, 100)).toBe(0)
    } finally {
      await session.close()
    }
  })

  // The regression. `LIMIT $batchSize` with a JS number reaches Cypher as `100000.0` and the
  // statement is rejected outright — `db:migrate up` died on it in CI.
  it('accepts a batch size the driver sends as a Cypher Float', async () => {
    const session = driver.session()
    try {
      await expect(deleteBatch(session, 100000)).resolves.toBe(7)
    } finally {
      await session.close()
    }
  })
})

describe(up, () => {
  it('deletes every relationship, across as many batches as it takes', async () => {
    // More edges than a single batch would be pointless to assert at the real BATCH_SIZE of
    // 100.000 — that is a load test, not a correctness one. What `up` owes is termination and
    // completeness, and both are visible here: an early-exiting loop leaves a non-zero count,
    // a non-terminating one never returns and the test times out.
    await givenRestrictions(250)

    await up(undefined)

    expect(await remainingRestrictions()).toBe(0)
  })

  it('is a no-op on a database that has none', async () => {
    await cleanDatabase()

    await up(undefined)

    expect(await remainingRestrictions()).toBe(0)
  })
})

describe(down, () => {
  // Empty on purpose: the deleted set was path-dependent (three code paths disagreed on whether
  // the author kept their own post), so no reconstruction is the data that was removed. The
  // migration says so in its own comment; this pins that `down` stays harmless rather than
  // growing a rebuild later that would quietly invent restrictions.
  it('leaves the database alone', async () => {
    await givenRestrictions(5)

    await down(undefined)

    expect(await remainingRestrictions()).toBe(5)
  })
})
