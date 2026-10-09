import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'

import { down, up } from './migrations/20261009120000-shouts-public-by-default'

const noop = () => undefined

const run = async (query: string, params: Record<string, unknown> = {}) => {
  const session = getDriver().session()
  try {
    return await session.writeTransaction((tx) => tx.run(query, params))
  } finally {
    await session.close()
  }
}

const settingsOf = async () => {
  const result = await run(
    `MATCH (u:User) RETURN u.id AS id, u.showShoutsPublicly AS shown,
       u.showShoutsPubliclyBeforeMigration AS before ORDER BY id`,
  )
  return result.records.map((record) => ({
    id: record.get('id') as string,
    shown: record.get('shown') as boolean | null,
    before: record.get('before') as string | null,
  }))
}

describe('migration: shouts-public-by-default', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await run(`
      CREATE (:User {id: 'a-private', showShoutsPublicly: false})
      CREATE (:User {id: 'b-public', showShoutsPublicly: true})
      CREATE (:User {id: 'c-unset'})
    `)
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  it('makes every user show their shouts, and keeps what they had', async () => {
    await up(noop)

    expect(await settingsOf()).toEqual([
      { id: 'a-private', shown: true, before: 'false' },
      { id: 'b-public', shown: true, before: 'true' },
      { id: 'c-unset', shown: true, before: 'unset' },
    ])
  })

  // A second run must not record `true` as what a private user had.
  it('is idempotent', async () => {
    await up(noop)
    await up(noop)

    expect((await settingsOf())[0]).toEqual({ id: 'a-private', shown: true, before: 'false' })
  })

  it('goes back to exactly what each user had', async () => {
    await up(noop)

    await down(noop)

    expect(await settingsOf()).toEqual([
      { id: 'a-private', shown: false, before: null },
      { id: 'b-public', shown: true, before: null },
      { id: 'c-unset', shown: null, before: null },
    ])
  })
})
