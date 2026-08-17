/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'

// Ordering by fields that are COMPUTED rather than stored.
//
// `_TagOrdering` offers taggedCount and taggedCountUnique, `_CategoryOrdering` offers
// postCount — none of them exist on the node. Sorting by `tag.taggedCount` therefore compares
// null against null on every row: no error, no reordering, just the previous order handed
// back. helpers/nodeQuery.ts maps these to expressions instead, and this is what holds it
// there, because the failure mode leaves nothing to notice.
//
// The fixtures separate the two count semantics on purpose: the tag with the MOST posts has
// the FEWEST distinct authors, so a run that confuses taggedCount with taggedCountUnique
// produces a visibly different order rather than the same one twice.

let setup: ApolloTestSetup

const tagQuery = parse(`
  query ($orderBy: [_TagOrdering]) {
    Tag(orderBy: $orderBy) {
      id
      taggedCount
      taggedCountUnique
    }
  }
`)

const categoryQuery = parse(`
  query ($orderBy: [_CategoryOrdering]) {
    Category(orderBy: $orderBy) {
      id
      postCount
    }
  }
`)

const orderedIds = async (query: ReturnType<typeof parse>, orderBy: string, root: string) => {
  const { data, errors } = await setup.query({ query, variables: { orderBy: [orderBy] } })
  expect(errors).toBeUndefined()
  const nodes = (data?.[root] ?? []) as { id: string }[]
  return nodes.map((node) => node.id)
}

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({
    context: () => ({ authenticatedUser: null, policy: { categoriesActive: true } }),
  })

  const [alice, bob, carol] = await Promise.all([
    Factory.build('user', { id: 'co-alice', name: 'Alice Author' }),
    Factory.build('user', { id: 'co-bob', name: 'Bob Author' }),
    Factory.build('user', { id: 'co-carol', name: 'Carol Author' }),
  ])

  // tag-many:  3 posts, all by Alice        → count 3, unique 1
  // tag-mid:   2 posts, by Bob and Carol    → count 2, unique 2
  // tag-few:   1 post,  by Alice            → count 1, unique 1
  const plan: [string, (typeof alice)[]][] = [
    ['tag-many', [alice, alice, alice]],
    ['tag-mid', [bob, carol]],
    ['tag-few', [alice]],
  ]

  const category = await Factory.build('category', { id: 'cat-two', name: 'Two', slug: 'two' })
  const emptyCategory = await Factory.build('category', {
    id: 'cat-none',
    name: 'None',
    slug: 'none',
  })
  void emptyCategory

  let postIndex = 0
  for (const [tagId, authors] of plan) {
    const tag = await Factory.build('tag', { id: tagId })
    for (const author of authors) {
      const post = await Factory.build('post', { id: `co-post-${String(postIndex++)}` }, { author })
      await tag.relateTo(post, 'post')
      // Two of the posts also land in a category, so postCount has something to order by.
      if (postIndex <= 2) await category.relateTo(post, 'post')
    }
  }
}, 120000)

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('ordering by computed fields', () => {
  it('sorts tags by taggedCount', async () => {
    await expect(orderedIds(tagQuery, 'taggedCount_desc', 'Tag')).resolves.toEqual([
      'tag-many',
      'tag-mid',
      'tag-few',
    ])
    await expect(orderedIds(tagQuery, 'taggedCount_asc', 'Tag')).resolves.toEqual([
      'tag-few',
      'tag-mid',
      'tag-many',
    ])
  }, 120000)

  it('sorts tags by taggedCountUnique, which is not the same order', async () => {
    // tag-mid has fewer posts but more distinct authors, so it leads here while trailing
    // above. That difference is what proves DISTINCT is actually applied.
    const byUnique = await orderedIds(tagQuery, 'taggedCountUnique_desc', 'Tag')

    expect(byUnique[0]).toBe('tag-mid')
    expect(byUnique).not.toEqual(await orderedIds(tagQuery, 'taggedCount_desc', 'Tag'))
  }, 120000)

  it('sorts categories by postCount', async () => {
    await expect(orderedIds(categoryQuery, 'postCount_desc', 'Category')).resolves.toEqual([
      'cat-two',
      'cat-none',
    ])
    await expect(orderedIds(categoryQuery, 'postCount_asc', 'Category')).resolves.toEqual([
      'cat-none',
      'cat-two',
    ])
  }, 120000)
})
