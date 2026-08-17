/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
// The instrumentation below wraps neo4j-driver internals, which ship no types for this kind
// of monkey-patching; the indexed access uses two literal method names, not input.
/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/require-await */
import Factory, { cleanDatabase } from '@db/factories'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

// Guards the property that neo4j-graphql-js used to provide for free: the number of Cypher
// round trips must not grow with the number of ROWS returned.
//
// The library translated a whole selection into one statement. Hand-written field resolvers
// do one each, which turned a 12-post feed into 171 round trips — a textbook N+1 that no
// correctness test would ever notice. The DataLoader registry in context/loaders.ts brings
// it back to a constant; this test is what stops it silently regressing.
//
// It asserts the SHAPE (constant, not linear), not an absolute number, so adding a field to
// the query does not make it fail spuriously — only losing the batching does.

const FEED_QUERY = `
  query Post($first: Int) {
    Post(first: $first) {
      id title content createdAt sortDate slug language postType
      pinnedAt pinned groupPinned
      image { url }
      author { id name slug }
      commentsCount shoutedCount shoutedByCurrentUser emotionsCount
      clickedCount viewedTeaserCount viewedTeaserByCurrentUser
      isObservedByMe observingUsersCount
      tags { id }
      categories { id slug name icon }
      pinnedBy { id name }
    }
  }
`

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

/** Runs the query with `transaction.run` counted. */
const countRoundTrips = async (query: string, variables: Record<string, unknown>) => {
  const { driver } = setup.database
  let runs = 0
  const openSession = driver.session.bind(driver)

  const instrument = (session: any, method: 'readTransaction' | 'writeTransaction') => {
    const runTransaction = session[method].bind(session)
    session[method] = async (work: any, ...rest: any[]) =>
      runTransaction(
        (transaction: any) => {
          const run = transaction.run.bind(transaction)
          transaction.run = (...runArgs: any[]) => {
            runs += 1
            return run(...runArgs)
          }
          return work(transaction)
        },
        ...rest,
      )
  }

  const spy = jest.spyOn(driver, 'session').mockImplementation(((...args: any[]) => {
    const session = openSession(...args)
    instrument(session, 'readTransaction')
    instrument(session, 'writeTransaction')
    return session
  }) as any)

  const result = await setup.query({ query, variables })
  spy.mockRestore()

  return { runs, errors: result.errors, rows: result.data?.Post?.length ?? 0 }
}

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }) })

  const author = await Factory.build('user', { id: 'batching-author' })
  const category = await Factory.build('category', { id: 'batching-category' })
  for (let index = 0; index < 12; index++) {
    const tag = await Factory.build('tag', { id: `batching-tag-${String(index)}` })
    const post = await Factory.build(
      'post',
      { id: `batching-post-${String(index)}` },
      { authorId: 'batching-author' },
    )
    await Promise.all([tag.relateTo(post, 'post'), category.relateTo(post, 'post')])
  }
  authenticatedUser = await author.toJson()
}, 120000)

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('Cypher round trips', () => {
  it('stay constant as the feed grows', async () => {
    const one = await countRoundTrips(FEED_QUERY, { first: 1 })
    const many = await countRoundTrips(FEED_QUERY, { first: 12 })

    expect(one.errors).toBeUndefined()
    expect(many.errors).toBeUndefined()
    // Guard the fixture: without more rows the comparison proves nothing.
    expect(one.rows).toBe(1)
    expect(many.rows).toBe(12)

    // The whole point. Un-batched, this was 17 vs 171.
    expect(many.runs).toBe(one.runs)
  }, 120000)

  it('does not scale round trips per row', async () => {
    const { runs, rows } = await countRoundTrips(FEED_QUERY, { first: 12 })

    // A generous ceiling: one statement per selected field would already exceed it, while
    // the batched implementation sits far below. Catches the regression, not the details.
    expect(rows).toBe(12)
    expect(runs).toBeLessThan(rows * 2)
  }, 120000)
})
