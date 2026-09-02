/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Factory, { cleanDatabase } from '@db/factories'
import resolvers from '@graphql/resolvers/index'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context/index'

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

  // Every fixture is built HERE, not inside the test that first needs it. Several cases read
  // the same node, and creating it in one of them would make the others depend on execution
  // order — `it.only`, a `-t` filter or a reordering would leave the node missing, and the
  // assertion then fails with "expected '' but got null". That reads like a broken fallback,
  // which is exactly the thing under test, so the misleading message would point at the code
  // instead of at the setup.
  //
  // A user without a primary email address — a state the product supports.
  await Factory.build('userWithoutEmailAddress', { id: 'no-mail' })
  await setup.database.write({
    query: `
      // A direct room left without its other participant.
      CREATE (:Room { id: 'lonely-room' })
      // A message that outlived its author, so the CREATED edge is gone.
      CREATE (:Message { id: 'orphan-message', createdAt: '2026-01-01T00:00:00.000Z' })
      // Nodes for the aggregate counter-example, with nothing pointing at them.
      CREATE (:Tag { id: 'unused-tag' })
      CREATE (:Category { id: 'empty-cat', name: 'Empty' })
    `,
  })
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
    await expect(resolve('User', 'email', { id: 'no-mail' })).resolves.toBe('')
  })

  it('resolves Room.roomName for a direct room without a remaining partner', async () => {
    // Neither a group name nor a partner name to coalesce — what a direct room looks like
    // once the other participant is deleted.
    await expect(resolve('Room', 'roomName', { id: 'lonely-room' })).resolves.toBe('')
  })

  it('resolves Message.senderId and username for a message whose author is gone', async () => {
    // Deleting a user detaches the CREATED edge; the message itself survives.
    await expect(resolve('Message', 'senderId', { id: 'orphan-message' })).resolves.toBe('')
    await expect(resolve('Message', 'username', { id: 'orphan-message' })).resolves.toBe('')
  })

  it('resolves aggregates to 0 without needing a fallback', async () => {
    // The counter-example that keeps the fallbacks above narrow: an aggregation produces a
    // row even when it counts nothing, so these fields cannot go null in the first place.
    await expect(resolve('Tag', 'taggedCount', { id: 'unused-tag' })).resolves.toBe(0)
    await expect(resolve('Tag', 'taggedCountUnique', { id: 'unused-tag' })).resolves.toBe(0)
    await expect(resolve('Category', 'postCount', { id: 'empty-cat' })).resolves.toBe(0)
  })

  it('still returns null for a parent that does not exist', async () => {
    // The fallback covers a missing EDGE, not a missing NODE. A parent id that resolves to
    // nothing is a caller error, and answering it with '' would dress it up as data.
    await expect(resolve('Room', 'lastMessage', { id: 'no-such-room' })).resolves.toBeNull()
  })

  it('applies the fallback when the parent carries an explicit null', async () => {
    // The pass-through path, which skips the query entirely. A parent reaches it carrying a
    // null either from a projection that coalesced to nothing or from a hand-built
    // subscription payload — CreateGroupRoom projects `roomName: group.name` that way. Left
    // unchanged, that null fails the non-null field exactly like an unresolved one, so the
    // shortcut must not be a hole in the guarantee.
    await expect(resolve('Room', 'roomName', { id: 'lonely-room', roomName: null })).resolves.toBe(
      '',
    )
    await expect(
      resolve('Message', 'senderId', { id: 'orphan-message', senderId: null }),
    ).resolves.toBe('')
  })

  it('applies the fallback when the parent has no id at all', async () => {
    // The third path into the resolver, next to the pass-through and the empty batch result.
    // A constructed parent — a subscription payload, a projection that never selected the id
    // — cannot be matched, so nothing can be looked up. The field is still non-null, and the
    // client cannot tell an unresolvable parent from a missing edge: in both cases the object
    // vanishes from the response. All three paths therefore answer the same way.
    await expect(resolve('Room', 'roomName', {})).resolves.toBe('')
    await expect(resolve('User', 'email', {})).resolves.toBe('')
  })

  it('still returns null without a fallback when the parent has no id', async () => {
    // The fallback is opt-in per field. A nullable field says null, which is the truth.
    await expect(resolve('Room', 'lastMessage', {})).resolves.toBeNull()
  })

  it('still prefers a real value carried by the parent', async () => {
    // The fallback must not shadow the pass-through's actual job.
    await expect(
      resolve('Room', 'roomName', { id: 'lonely-room', roomName: 'Projected' }),
    ).resolves.toBe('Projected')
  })
})
