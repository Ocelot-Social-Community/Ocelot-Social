/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// The parts of posts.ts a GraphQL request cannot reach, called directly.
//
// Two kinds live here:
//
//   * The `Missing authenticated user` guards. Every one of them sits behind an
//     `isAuthenticated`-shaped shield rule, so `context.user` is already guaranteed by the
//     time a request arrives. They are the second lock: what stops an internal caller (a
//     seeder, a migration, a future subscription resolver) from writing a post that belongs
//     to nobody, or from reading "my" emotions with no `my`.
//   * The batched field resolvers, whose fallbacks depend on a parent shape the schema does
//     not produce — a parent without an id, an id whose post is gone, a value the parent
//     query already projected.
import { beforeAll, afterAll, describe, it, expect } from 'vitest'

import { createLoaders } from '@context/loaders'
import { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'

import postsResolvers from './posts'

import type { Context } from '@src/context'
import type { Driver } from 'neo4j-driver'

let driver: Driver

const run = async (cypher: string, params: Record<string, unknown> = {}) => {
  const session = driver.session()
  try {
    return await session.writeTransaction((transaction) => transaction.run(cypher, params))
  } finally {
    await session.close()
  }
}

// Deliberately minimal: only what each guard reads before it refuses. A resolver that got
// far enough to need more than this has already failed the test.
const anonymousContext = () => ({ user: null, driver }) as unknown as Context

// Field resolvers run per parent and go through the request-scoped loaders, so they need the
// same shape the real context builds — with an anonymous viewer.
const fieldContext = () =>
  ({
    driver,
    loaders: createLoaders(driver, null),
    cypherParams: { currentUserId: null },
  }) as unknown as Context

beforeAll(async () => {
  await cleanDatabase()
  driver = getDriver()
})

afterAll(async () => {
  await cleanDatabase()
  await closeDriver()
})

describe('post resolvers without an authenticated user', () => {
  // Keyed by resolver name so the failure message names the resolver that let an anonymous
  // caller through — the whole point of the assertion.
  const calls = {
    CreatePost: async () => {
      await postsResolvers.Mutation.CreatePost(
        null,
        { title: 'Anonymous', content: 'Anonymous', postType: 'Article' },
        anonymousContext(),
        null,
      )
    },
    pinPost: async () => {
      await postsResolvers.Mutation.pinPost(null, { id: 'p1' }, anonymousContext(), null)
    },
    pinGroupPost: async () => {
      await postsResolvers.Mutation.pinGroupPost(null, { id: 'p1' }, anonymousContext(), null)
    },
    PostsEmotionsByCurrentUser: async () => {
      await postsResolvers.Query.PostsEmotionsByCurrentUser(
        null,
        { postId: 'p1' },
        anonymousContext(),
        null,
      )
    },
  }

  it.each(Object.entries(calls))('%s refuses to act', async (_name, call) => {
    // Refuse BEFORE touching the database: a post created here would have no WROTE edge and
    // no author, and the pin mutations would attach a PINNED edge to nobody.
    await expect(call()).rejects.toThrow('Missing authenticated user.')
  })
})

describe('Post.comments', () => {
  it('returns an empty list for a parent that carries no id', async () => {
    // The batch key IS the parent id. A parent without one (a projection that did not select
    // id, a stub in a test) would key the DataLoader on `undefined` — and since the loader
    // caches per key, every such parent in the request would then share one answer.
    await expect(postsResolvers.Post.comments({}, {}, fieldContext())).resolves.toEqual([])
  })

  it('returns an empty list for a post the batch query found no row for', async () => {
    // `UNWIND $ids ... MATCH (post:Post {id: __id})` simply drops ids it cannot match (a post
    // deleted between the list query and this field resolving). DataLoader contracts for one
    // entry per key, so the missing id must map to an empty list — returning undefined here
    // would surface as `null` for the non-nullable `comments` field.
    await expect(
      postsResolvers.Post.comments({ id: 'never-existed' }, {}, fieldContext()),
    ).resolves.toEqual([])
  })
})

describe('Post.relatedContributions', () => {
  beforeAll(async () => {
    // Two visible posts and one deleted one, all sharing a single category.
    await run(`
      CREATE (category:Category { id: 'related-category', name: 'Related', icon: 'tree' })
      CREATE (source:Post { id: 'related-source', deleted: false, disabled: false })
      CREATE (sibling:Post { id: 'related-sibling', deleted: false, disabled: false })
      CREATE (removed:Post { id: 'related-deleted', deleted: true, disabled: false })
      CREATE (source)-[:CATEGORIZED]->(category)
      CREATE (sibling)-[:CATEGORIZED]->(category)
      CREATE (removed)-[:CATEGORIZED]->(category)
    `)
  })

  it('returns a value the parent query already projected instead of querying again', async () => {
    // The field is also produced as part of some post projections. Re-querying would cost a
    // round trip per post in a feed and could contradict what the parent already returned.
    const projected = [{ id: 'projected-by-parent' }]

    await expect(
      postsResolvers.Post.relatedContributions(
        { id: 'related-source', relatedContributions: projected },
        {},
        fieldContext(),
        null,
      ),
    ).resolves.toBe(projected)
  })

  it('finds posts sharing a category and leaves out deleted ones', async () => {
    // "Related" is a public-facing recommendation: a deleted post must not reappear through
    // it after its author removed it.
    const related = await postsResolvers.Post.relatedContributions(
      { id: 'related-source' },
      {},
      fieldContext(),
      null,
    )

    expect(related.map((post: { id: string }) => post.id)).toEqual(['related-sibling'])
  })
})
