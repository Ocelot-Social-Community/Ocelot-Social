// Runs with Redis stopped. Live events are lost then, the write must not be: it has committed
// long before anything is published, and a user waiting on a broker has nothing to gain from it.

import { afterAll, describe, expect, it } from 'vitest'

import { buildUser, FIRST, query } from './helpers'

afterAll(async () => {
  const { getDriver } = await import('@db/neo4j')
  await getDriver().close()
})

describe('with Redis gone', () => {
  it('a chat message is still answered', async () => {
    const alice = await buildUser('alice-down')
    await buildUser('bob-down')

    const sent = await query(
      FIRST,
      `mutation { CreateMessage(userId: "bob-down", content: "Still here") { content } }`,
      { token: alice },
    )

    expect(sent.errors).toBeUndefined()
    expect(sent.data).toEqual({ CreateMessage: { content: 'Still here' } })
  })

  it('a policy change is still answered', async () => {
    const owner = await buildUser('owner-down', 'owner')

    const changed = await query(
      FIRST,
      `mutation { setPolicy(key: publicRegistration, value: "true") { key } }`,
      { token: owner },
    )

    expect(changed.errors).toBeUndefined()
  })
})
