/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'
import { expect, beforeAll, afterAll, describe, it } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// `showShoutsPublicly` was stored and shown in the settings, but nothing read it after 2021: the
// check lived in a commented-out profile tab that a cleanup removed. Every way the shouts of a
// user surface is checked here — their list and count on the profile, the feed filter behind the
// profile tab, the shouters of a post — since hiding them in one place but not another hides
// nothing.
//
// One post, shouted by somebody who keeps it private and by somebody who shows it.

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

const users = new Map<string, Context['user']>()

const asUser = (name: string | null) => {
  authenticatedUser = name ? (users.get(name) ?? null) : null
}

const userQuery = parse(`
  query ($id: ID!) {
    User(id: $id) {
      shouted { id }
      shoutedCount
    }
  }
`)

const postQuery = parse(`
  query ($id: ID!) {
    Post(id: $id) {
      shoutedBy { id }
      shoutedCount
    }
  }
`)

const feedQuery = parse(`
  query ($filter: _PostFilter) {
    Post(filter: $filter) { id }
  }
`)

const shoutsOf = async (id: string) => {
  const { data, errors } = await setup.query({ query: userQuery, variables: { id } })

  expect(errors).toBeUndefined()

  const [user] = data?.User as { shouted: { id: string }[]; shoutedCount: number }[]
  return { shouted: user.shouted.map((post) => post.id), shoutedCount: user.shoutedCount }
}

const shoutersOf = async (id: string) => {
  const { data, errors } = await setup.query({ query: postQuery, variables: { id } })

  expect(errors).toBeUndefined()

  const [post] = data?.Post as { shoutedBy: { id: string }[]; shoutedCount: number }[]
  return {
    shoutedBy: post.shoutedBy.map((user) => user.id).sort(),
    shoutedCount: post.shoutedCount,
  }
}

const feedShoutedBy = async (id: string) => {
  const { data, errors } = await setup.query({
    query: feedQuery,
    variables: { filter: { shoutedBy_some: { id } } },
  })

  expect(errors).toBeUndefined()

  return (data?.Post as { id: string }[]).map((post) => post.id)
}

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }) })

  const [author, privateShouter, publicShouter, stranger, moderator] = await Promise.all([
    Factory.build('user', { id: 'sv-author' }),
    Factory.build('user', { id: 'sv-private', showShoutsPublicly: false }),
    Factory.build('user', { id: 'sv-public', showShoutsPublicly: true }),
    Factory.build('user', { id: 'sv-stranger' }),
    Factory.build('user', { id: 'sv-moderator', role: 'moderator' }),
  ])
  const viewers = { private: privateShouter, public: publicShouter, stranger, moderator }
  for (const [name, built] of Object.entries(viewers)) {
    const user: Context['user'] = await built.toJson()
    users.set(name, user)
  }

  await Factory.build('post', { id: 'sv-post' }, { author })
  await setup.database.write({
    query: `
      MATCH (post:Post { id: 'sv-post' }), (shouter:User)
      WHERE shouter.id IN ['sv-private', 'sv-public']
      MERGE (post)<-[:SHOUTED]-(shouter)
    `,
  })
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('the shouts of somebody who keeps them private', () => {
  // `User` needs a signed-in viewer at all; a visitor reaches shouts only through the feed.
  it.each([['stranger'], ['moderator']])('are hidden from %s on their profile', async (viewer) => {
    asUser(viewer)

    await expect(shoutsOf('sv-private')).resolves.toEqual({ shouted: [], shoutedCount: 0 })
  })

  it.each([['stranger'], ['moderator'], [null]])(
    'are hidden from %s in the feed filter behind the profile tab',
    async (viewer) => {
      asUser(viewer)

      await expect(feedShoutedBy('sv-private')).resolves.toEqual([])
    },
  )

  it('leave the shouters of a post, but not its count', async () => {
    // A number names nobody; the list does.
    asUser('stranger')

    await expect(shoutersOf('sv-post')).resolves.toEqual({
      shoutedBy: ['sv-public'],
      shoutedCount: 2,
    })
  })

  it('stay visible to their owner everywhere', async () => {
    asUser('private')

    await expect(shoutsOf('sv-private')).resolves.toEqual({
      shouted: ['sv-post'],
      shoutedCount: 1,
    })
    await expect(feedShoutedBy('sv-private')).resolves.toEqual(['sv-post'])
    await expect(shoutersOf('sv-post')).resolves.toMatchObject({
      shoutedBy: ['sv-private', 'sv-public'],
    })
  })
})

describe('the shouts of somebody who shows them', () => {
  it('are visible to others on their profile', async () => {
    asUser('stranger')

    await expect(shoutsOf('sv-public')).resolves.toEqual({
      shouted: ['sv-post'],
      shoutedCount: 1,
    })
  })

  it.each([['stranger'], [null]])('are visible to %s in the feed filter', async (viewer) => {
    asUser(viewer)

    await expect(feedShoutedBy('sv-public')).resolves.toEqual(['sv-post'])
  })
})
