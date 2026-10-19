import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { down, up } from './migrations/20261019120000-end-follows-across-blocks'

const noop = () => undefined

const run = async (query: string, params: Record<string, unknown> = {}) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((tx) => tx.run(query, params))
  } finally {
    await session.close()
  }
}

const follows = async (): Promise<[string, string][]> => {
  const result = await run(
    `MATCH (from:User)-[follows:FOLLOWS]->(to:User)
     RETURN from.id + ' -> ' + to.id AS edge, follows.createdAt AS since ORDER BY edge`,
  )
  return result.records.map((record) => [
    record.get('edge') as string,
    record.get('since') as string,
  ])
}

// blocker blocked `blocked`, who still follows them (what blockUser left behind), and who was
// followed back; the bystander follows the blocker and is not part of any block.
describe('migration: end-follows-across-blocks', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await run(`
      CREATE (blocker:User {id: 'blocker'}), (blocked:User {id: 'blocked'}),
             (bystander:User {id: 'bystander'})
      CREATE (blocker)-[:BLOCKED {createdAt: '2026-01-02T00:00:00.000Z'}]->(blocked)
      CREATE (blocked)-[:FOLLOWS {createdAt: '2025-05-05T00:00:00.000Z'}]->(blocker)
      CREATE (blocker)-[:FOLLOWS {createdAt: '2025-06-06T00:00:00.000Z'}]->(blocked)
      CREATE (bystander)-[:FOLLOWS {createdAt: '2025-07-07T00:00:00.000Z'}]->(blocker)
    `)
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  it('ends following across the block, in both directions, and nothing else', async () => {
    await up(noop)

    expect(await follows()).toEqual([['bystander -> blocker', '2025-07-07T00:00:00.000Z']])
  })

  it('is idempotent', async () => {
    await up(noop)
    await up(noop)

    expect(await follows()).toEqual([['bystander -> blocker', '2025-07-07T00:00:00.000Z']])
  })

  it('restores the follows on down, with the dates they had', async () => {
    await up(noop)
    await down(noop)

    expect(await follows()).toEqual([
      ['blocked -> blocker', '2025-05-05T00:00:00.000Z'],
      ['blocker -> blocked', '2025-06-06T00:00:00.000Z'],
      ['bystander -> blocker', '2025-07-07T00:00:00.000Z'],
    ])

    const block = await run(`MATCH ()-[block:BLOCKED]->() RETURN properties(block) AS props`)

    expect(block.records[0].get('props')).toEqual({ createdAt: '2026-01-02T00:00:00.000Z' })
  })

  // The memory of an ended follow lives on the BLOCKED edge: an unblock deletes it, and with it
  // what down could restore — as an unblock after the fix brings no follow back either.
  it('restores nothing on down after an unblock', async () => {
    await up(noop)
    await run(`MATCH ()-[block:BLOCKED]->() DELETE block`)
    await down(noop)

    expect(await follows()).toEqual([['bystander -> blocker', '2025-07-07T00:00:00.000Z']])
  })
})
