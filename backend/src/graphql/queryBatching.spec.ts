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

// The chat list, mirroring the selection in webapp/graphql/Rooms.js. Its computed fields
// (roomId, roomName, avatar, isGroupRoom, lastMessage, unreadCount) each resolve through
// cypherFields or a loader, so an unbatched implementation would cost one statement per
// field PER ROOM.
const CHAT_LIST_QUERY = `
  query Room($first: Int) {
    Room(first: $first) {
      id roomId roomName avatar isGroupRoom lastMessageAt createdAt unreadCount
      lastMessage { id content senderId username date }
      users { id name }
    }
  }
`

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

/** Runs the query with `transaction.run` counted. */
const countRoundTrips = async (
  query: string,
  variables: Record<string, unknown>,
  rootField = 'Post',
) => {
  const { driver } = setup.database
  let runs = 0
  // Every `ids` array a batched statement was called with, so a test can assert that no
  // statement was handed the same key twice.
  const idBatches: string[][] = []
  const openSession = driver.session.bind(driver)

  const instrument = (session: any, method: 'readTransaction' | 'writeTransaction') => {
    const runTransaction = session[method].bind(session)
    session[method] = async (work: any, ...rest: any[]) =>
      runTransaction(
        (transaction: any) => {
          const run = transaction.run.bind(transaction)
          transaction.run = (...runArgs: any[]) => {
            runs += 1
            const ids = (runArgs[1] as { ids?: unknown })?.ids
            if (Array.isArray(ids)) idBatches.push(ids as string[])
            return run(...runArgs)
          }
          return work(transaction)
        },
        ...rest,
      )
  }

  // Statements sent straight through the session, bypassing a transaction function. No
  // resolver does this today (only a migration does), but the count is the whole claim of
  // this test: a resolver written with `session.run` would issue real round trips that the
  // transaction wrappers above cannot see, and an N+1 introduced that way would sit behind a
  // green test.
  const instrumentDirectRun = (session: any) => {
    const run = session.run.bind(session)
    session.run = (...runArgs: any[]) => {
      runs += 1
      return run(...runArgs)
    }
  }

  const spy = jest.spyOn(driver, 'session').mockImplementation(((...args: any[]) => {
    const session = openSession(...args)
    instrument(session, 'readTransaction')
    instrument(session, 'writeTransaction')
    instrumentDirectRun(session)
    return session
  }) as any)

  // Restored in `finally`, because leaving the patch in place would not just skip cleanup —
  // the next call binds `driver.session` again, this time capturing the ALREADY patched
  // function. The instrumentation would nest and count every statement twice, so one failure
  // here would turn into wrong numbers for the rest of the file rather than a local error.
  let result
  try {
    result = await setup.query({ query, variables })
  } finally {
    spy.mockRestore()
  }

  return { runs, idBatches, errors: result.errors, rows: result.data?.[rootField]?.length ?? 0 }
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
  // Rooms and messages have no neode model, so their edges are written directly. The shape
  // matches what CreateRoom/CreateMessage produce: CHATS_IN from both participants, INSIDE
  // from the message, CREATED from its sender.
  for (let index = 0; index < 12; index++) {
    const partner = await Factory.build('user', { id: `batching-partner-${String(index)}` })
    void partner
    await setup.database.write({
      query: `
        MATCH (me:User { id: 'batching-author' })
        MATCH (partner:User { id: $partnerId })
        CREATE (room:Room { id: $roomId, createdAt: $createdAt, lastMessageAt: $createdAt })
        CREATE (me)-[:CHATS_IN]->(room)
        CREATE (partner)-[:CHATS_IN]->(room)
        CREATE (partner)-[:CREATED]->(:Message {
          id: $messageId, content: 'hello', createdAt: $createdAt, indexId: 1
        })-[:INSIDE]->(room)
      `,
      variables: {
        partnerId: `batching-partner-${String(index)}`,
        roomId: `batching-room-${String(index)}`,
        messageId: `batching-message-${String(index)}`,
        createdAt: `2026-01-${String(index + 10)}T00:00:00.000Z`,
      },
    })
  }

  authenticatedUser = await author.toJson()
}, 120000)

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

// Why the comparisons below can be EXACT rather than approximate: the fixtures are
// deliberately uniform — every post carries the same relations, every room the same single
// message. A field present on some rows but not others would not be batched any worse, yet
// could still shift the count, because a loader that no row triggers is never flushed at
// all. Keep new fixtures uniform, or compare with the per-row ceiling below instead.
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

  it('stay constant as the chat list grows', async () => {
    // The claim under test: the chat list's computed fields are said to cost one query per
    // field per room. They batch through cypherFields, so the count must not move.
    const one = await countRoundTrips(CHAT_LIST_QUERY, { first: 1 }, 'Room')
    const many = await countRoundTrips(CHAT_LIST_QUERY, { first: 12 }, 'Room')

    expect(one.errors).toBeUndefined()
    expect(many.errors).toBeUndefined()
    expect(one.rows).toBe(1)
    expect(many.rows).toBe(12)

    expect(many.runs).toBe(one.runs)
  }, 120000)

  // Selects a field that is RESOLVED for the shared author, not just read off the node.
  // `author { id name slug }` in FEED_QUERY comes straight from the post's parent projection
  // and never reaches a loader, so it cannot produce duplicate keys — which is exactly how an
  // earlier version of this test passed without any deduplication in place.
  const SHARED_AUTHOR_QUERY = `
    query Post($first: Int) {
      Post(first: $first) {
        id
        author { id followedByCurrentUser isBlocked followedByCount }
      }
    }
  `

  it('never asks a statement for the same key twice', async () => {
    // `cache: false` on the loaders turns off DataLoader's per-batch dedup along with its
    // memoisation, so a feed where many rows share a parent (12 posts, one author) hands the
    // same key to `.load()` over and over. Without deduplication the author's fields are
    // looked up once PER POST inside a single UNWIND — invisible to the round-trip count
    // above, which stays at one statement either way.
    const { idBatches, rows, errors } = await countRoundTrips(SHARED_AUTHOR_QUERY, { first: 12 })

    // Checked FIRST. GraphQL answers partially: the 12 posts can come back while every
    // author field fails, and a field that errors may never reach its loader — no batch, no
    // duplicates, assertion satisfied by an execution that tested nothing. `rows` counts
    // posts, so it stays at 12 and hides it.
    expect(errors).toBeUndefined()
    expect(rows).toBe(12)

    const withDuplicates = idBatches.filter((ids) => new Set(ids).size !== ids.length)
    expect(withDuplicates).toEqual([])
    // Guard the probe: no batches at all would satisfy the assertion vacuously.
    expect(idBatches.length).toBeGreaterThan(0)
  }, 120000)

  it('does not scale round trips per row', async () => {
    const { runs, rows, errors } = await countRoundTrips(FEED_QUERY, { first: 12 })

    // Same reason as above: a failed field selection means fewer statements, which would
    // make this ceiling easier to meet rather than harder.
    expect(errors).toBeUndefined()

    // A generous ceiling: one statement per selected field would already exceed it, while
    // the batched implementation sits far below. Catches the regression, not the details.
    expect(rows).toBe(12)
    expect(runs).toBeLessThan(rows * 2)
  }, 120000)
})
