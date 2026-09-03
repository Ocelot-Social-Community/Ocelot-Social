/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'
import { expect, beforeAll, afterAll, describe, it } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// The three relation filters the webapp sends and the schema had stopped declaring.
//
// `_PostFilter` was hand-written during the neo4j-graphql-js migration; the library had
// GENERATED it from the type's relations, and `tags_some` / `comments_some` /
// `shoutedBy_some` were left out. The start page's hashtag filter and the profile page's
// "comments" and "shouts" tabs sent them anyway and failed on variable coercion.
//
// webappPostFilters.spec.ts guards the declaration. This checks the TRANSLATION against real
// data, because a filter can be declared, translate to syntactically fine Cypher, and still
// traverse the wrong way round — which would silently return the wrong posts rather than
// error. Each case therefore includes a post that must NOT match.

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

const postQuery = parse(`
  query ($filter: _PostFilter) {
    Post(filter: $filter, orderBy: [createdAt_asc]) {
      id
    }
  }
`)

const idsFor = async (filter: Record<string, unknown>): Promise<string[]> => {
  const { data, errors } = await setup.query({ query: postQuery, variables: { filter } })

  expect(errors).toBeUndefined()

  const posts = (data?.Post ?? []) as { id: string }[]
  return posts.map((post) => post.id)
}

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }) })

  const [author, commenter] = await Promise.all([
    Factory.build('user', { id: 'rf-author', name: 'Author' }),
    Factory.build('user', { id: 'rf-commenter', name: 'Commenter' }),
    // Matched by id in the MERGE below rather than through its return value.
    Factory.build('user', { id: 'rf-shouter', name: 'Shouter' }),
  ])
  authenticatedUser = await author.toJson()

  // "match" carries every relation under test, "other" carries none of them.
  await Factory.build('post', { id: 'rf-match' }, { author })
  await Factory.build('post', { id: 'rf-other' }, { author })

  await Factory.build('tag', { id: 'rf-hashtag' })
  await Factory.build('comment', { id: 'rf-comment' }, { author: commenter, postId: 'rf-match' })

  await setup.database.write({
    query: `
      MATCH (post:Post { id: 'rf-match' }), (tag:Tag { id: 'rf-hashtag' })
      MERGE (post)-[:TAGGED]->(tag)
      WITH post
      MATCH (shouter:User { id: 'rf-shouter' })
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

describe('relation filters', () => {
  it('tags_some selects posts carrying the hashtag', async () => {
    await expect(idsFor({ tags_some: { id: 'rf-hashtag' } })).resolves.toEqual(['rf-match'])
  })

  it('tags_some accepts an id list', async () => {
    await expect(idsFor({ tags_some: { id_in: ['rf-hashtag', 'absent'] } })).resolves.toEqual([
      'rf-match',
    ])
  })

  it('comments_some selects posts the given user commented on', async () => {
    await expect(idsFor({ comments_some: { author: { id: 'rf-commenter' } } })).resolves.toEqual([
      'rf-match',
    ])
  })

  it('comments_some does not select posts commented on by someone else', async () => {
    // The traversal runs post → comment → author. Reversed or mis-anchored, it would match
    // any post with any comment, and the profile tab would list strangers' posts.
    await expect(idsFor({ comments_some: { author: { id: 'rf-shouter' } } })).resolves.toEqual([])
  })

  it('shoutedBy_some selects posts the given user shouted', async () => {
    await expect(idsFor({ shoutedBy_some: { id: 'rf-shouter' } })).resolves.toEqual(['rf-match'])
  })

  it('shoutedBy_some does not select posts shouted by someone else', async () => {
    await expect(idsFor({ shoutedBy_some: { id: 'rf-commenter' } })).resolves.toEqual([])
  })
})
