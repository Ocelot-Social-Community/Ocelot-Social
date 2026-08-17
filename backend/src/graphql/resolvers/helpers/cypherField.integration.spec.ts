/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Factory, { cleanDatabase } from '@db/factories'
import resolvers from '@graphql/resolvers'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

type FieldResolver = (
  parent: unknown,
  args: unknown,
  context: Context,
  info: unknown,
) => Promise<unknown>

// Non-null cypherFields whose data can legitimately be missing.
//
// A statement that matches nothing returns no row at all, so the resolver has nothing to
// hand back. On a non-null field GraphQL refuses that null and propagates the error up to
// the nearest nullable ancestor — which removes the whole PARENT object from the response.
// A single deleted account would blank a room, and with it the chat list around it.
//
// Each case below is a state the product allows, reproduced here against the database
// rather than argued about: the `fallback` these fields declare is only justified if the
// gap it covers is real. Aggregates are in the same list as the counter-example — they need
// no fallback, because `RETURN count(...)` is an aggregation and yields a row of 0 on its own.

let setup: ApolloTestSetup
let context: Context

/* Type and field names below are literals from this file, never request data. */
/* eslint-disable security/detect-object-injection */
const resolve = async (type: string, field: string, parent: Record<string, unknown>) =>
  (resolvers as Record<string, Record<string, FieldResolver>>)[type][field](parent, {}, context, {})
/* eslint-enable security/detect-object-injection */

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser: null }) })
  const { createLoaders } = await import('@context/loaders')
  context = {
    driver: setup.database.driver,
    cypherParams: { currentUserId: 'nobody' },
    loaders: createLoaders(setup.database.driver, 'nobody'),
  } as unknown as Context
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('non-null fields with missing data', () => {
  it('resolves User.email for a user that has no primary email', async () => {
    // Supported state — hence the factory. Erroring here would lock such a user out of
    // their own settings page, since the error takes the entire User with it.
    await Factory.build('userWithoutEmailAddress', { id: 'no-mail' })

    await expect(resolve('User', 'email', { id: 'no-mail' })).resolves.toBe('')
  })

  it('resolves Room.roomName for a direct room without a remaining partner', async () => {
    // Neither a group name nor a partner name to coalesce — what a direct room looks like
    // once the other participant is deleted.
    await setup.database.write({ query: `CREATE (:Room { id: 'lonely-room' })` })

    await expect(resolve('Room', 'roomName', { id: 'lonely-room' })).resolves.toBe('')
  })

  it('resolves Message.senderId and username for a message whose author is gone', async () => {
    // Deleting a user detaches the CREATED edge; the message itself survives.
    await setup.database.write({
      query: `CREATE (:Message { id: 'orphan-message', createdAt: '2026-01-01T00:00:00.000Z' })`,
    })

    await expect(resolve('Message', 'senderId', { id: 'orphan-message' })).resolves.toBe('')
    await expect(resolve('Message', 'username', { id: 'orphan-message' })).resolves.toBe('')
  })

  it('resolves aggregates to 0 without needing a fallback', async () => {
    // The counter-example that keeps the fallbacks above narrow: an aggregation produces a
    // row even when it counts nothing, so these fields cannot go null in the first place.
    await setup.database.write({ query: `CREATE (:Tag { id: 'unused-tag' })` })
    await setup.database.write({ query: `CREATE (:Category { id: 'empty-cat', name: 'Empty' })` })

    await expect(resolve('Tag', 'taggedCount', { id: 'unused-tag' })).resolves.toBe(0)
    await expect(resolve('Tag', 'taggedCountUnique', { id: 'unused-tag' })).resolves.toBe(0)
    await expect(resolve('Category', 'postCount', { id: 'empty-cat' })).resolves.toBe(0)
  })

  it('still returns null for a parent that does not exist', async () => {
    // The fallback covers a missing EDGE, not a missing NODE. A parent id that resolves to
    // nothing is a caller error, and answering it with '' would dress it up as data.
    await expect(resolve('Room', 'lastMessage', { id: 'no-such-room' })).resolves.toBeNull()
  })
})
