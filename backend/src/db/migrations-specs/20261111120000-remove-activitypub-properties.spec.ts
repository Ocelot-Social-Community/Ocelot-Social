import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { down, up } from '@db/migrations/20261111120000-remove-activitypub-properties'
import { getDriver } from '@db/neo4j'

const noop = () => undefined

const run = async (query: string) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((tx) => tx.run(query))
  } finally {
    await session.close()
  }
}

const propertiesOf = async (): Promise<Record<string, string[]>> => {
  const result = await run(
    `MATCH (node) WHERE node.id IN ['user', 'clean-user', 'post', 'comment', 'group']
     RETURN node.id AS id, keys(node) AS keys ORDER BY id`,
  )
  return Object.fromEntries(
    result.records.map((record) => [
      record.get('id') as string,
      (record.get('keys') as string[]).sort(),
    ]),
  )
}

// One node of each label carrying everything ActivityPub left behind, next to properties that
// must stay — among them a `publicKey`-like name on a label the migration does not touch.
describe('migration: remove-activitypub-properties', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await run(`
      CREATE (:User { id: 'user', name: 'Kept', actorId: 'a', publicKey: 'p', privateKey: 'k' })
      CREATE (:User { id: 'clean-user', name: 'Kept' })
      CREATE (:Post { id: 'post', title: 'Kept', activityId: 'x', objectId: 'y' })
      CREATE (:Comment { id: 'comment', content: 'Kept', activityId: 'z' })
      CREATE (:Group { id: 'group', name: 'Kept', activityId: 'not ours' })
    `)
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  const AFTER = {
    'clean-user': ['id', 'name'],
    comment: ['content', 'id'],
    group: ['activityId', 'id', 'name'],
    post: ['id', 'title'],
    user: ['id', 'name'],
  }

  it('removes the ActivityPub properties, and nothing else', async () => {
    await up(noop)

    expect(await propertiesOf()).toEqual(AFTER)
  })

  it('is idempotent', async () => {
    await up(noop)
    await up(noop)

    expect(await propertiesOf()).toEqual(AFTER)
  })

  it('brings nothing back on down', async () => {
    await up(noop)
    await down(noop)

    expect(await propertiesOf()).toEqual(AFTER)
  })
})
