/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parse } from 'graphql'
import { expect, beforeAll, afterAll, describe, it } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// Paging over rows that TIE on the requested sort key.
//
// Cypher puts no order on rows with equal sort values, so an ORDER BY that is only partial
// leaves SKIP/LIMIT free to return a row on two consecutive pages while another never
// appears at all. Nothing errors — the reader just sees a post twice, or misses one.
//
// helpers/ordering.ts appends the node's id to every clause to make the order total. These
// fixtures all share one createdAt, which is what makes the guarantee observable: without
// the tiebreaker every row here is interchangeable to the planner.

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

const SHARED_TIMESTAMP = '2026-03-01T12:00:00.000Z'
const POST_COUNT = 6
const PAGE_SIZE = 2

const pagedQuery = parse(`
  query ($first: Int, $offset: Int) {
    Post(first: $first, offset: $offset, orderBy: [createdAt_desc]) {
      id
    }
  }
`)

const page = async (offset: number): Promise<string[]> => {
  const { data, errors } = await setup.query({
    query: pagedQuery,
    variables: { first: PAGE_SIZE, offset },
  })

  expect(errors).toBeUndefined()

  const posts = (data?.Post ?? []) as { id: string }[]
  return posts.map((post) => post.id)
}

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }) })

  const author = await Factory.build('user', { id: 'paging-author' })
  authenticatedUser = await author.toJson()

  for (let index = 0; index < POST_COUNT; index++) {
    await Factory.build(
      'post',
      { id: `paging-post-${String(index)}`, createdAt: SHARED_TIMESTAMP },
      { authorId: 'paging-author' },
    )
  }
  // The factory may stamp its own createdAt; force the tie explicitly.
  await setup.database.write({
    query: `MATCH (p:Post) WHERE p.id STARTS WITH 'paging-post-' SET p.createdAt = $at`,
    variables: { at: SHARED_TIMESTAMP },
  })
}, 120000)

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('paging over tied sort values', () => {
  it('visits every post exactly once across pages', async () => {
    const pages: string[][] = []
    for (let offset = 0; offset < POST_COUNT; offset += PAGE_SIZE) {
      pages.push(await page(offset))
    }
    const seen = pages.flat()

    // The failure this guards: a duplicate on one page and a missing post on another, which
    // add up to the same total and would pass a length-only check.
    expect(new Set(seen).size).toBe(POST_COUNT)
    expect([...seen].sort()).toEqual(
      Array.from({ length: POST_COUNT }, (_, index) => `paging-post-${String(index)}`).sort(),
    )
  }, 120000)

  it('returns the same page twice in a row', async () => {
    // A partial order may also be unstable BETWEEN requests, which makes "load more" skip
    // rows the reader has not seen yet.
    await expect(page(2)).resolves.toEqual(await page(2))
  }, 120000)
})
