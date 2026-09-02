/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parse } from 'graphql'

import Factory, { cleanDatabase } from '@db/factories'
import CreateMessage from '@graphql/queries/messaging/CreateMessage.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context/index'

// Room.roomName is derived in TWO places, and this holds them to the same answer.
//
// The chat list query computes it inline (for the search filter) and projects it, so
// Room.roomName's pass-through returns the projected value without querying — one round trip
// saved per chat list. Every other path (a single room, a subscription payload) has no
// projection and falls through to the statement in cypherFields.
//
// That is a duplicated expression, and a duplicated expression drifts. If the two stop
// agreeing, the name shown in the list and the name shown in the room silently differ, with
// nothing failing. Comparing the two paths is the only thing that keeps them honest.

let setup: ApolloTestSetup
let authenticatedUser: Context['user']

const listQuery = parse(`{ Room { id roomName } }`)
const singleQuery = parse(`query ($id: ID) { Room(id: $id) { id roomName } }`)

beforeAll(async () => {
  await cleanDatabase()
  setup = await createApolloTestSetup({ context: () => ({ authenticatedUser }) })

  const [me, partner] = await Promise.all([
    Factory.build('user', { id: 'rn-me', name: 'Current User' }),
    Factory.build('user', { id: 'rn-partner', name: 'Chat Partner' }),
  ])
  void partner
  authenticatedUser = await me.toJson()

  // The real path into a direct room: sending a message creates it.
  await setup.mutate({
    mutation: CreateMessage,
    variables: { roomId: null, userId: 'rn-partner', content: 'hello' },
  })
})

afterAll(async () => {
  await cleanDatabase()
  void setup.server.stop()
  void setup.database.driver.close()
  setup.database.neode.close()
})

describe('Room.roomName', () => {
  it('is the same from the list projection and from the statement', async () => {
    const list = await setup.query({ query: listQuery })
    expect(list.errors).toBeUndefined()
    const rooms = (list.data?.Room ?? []) as { id: string; roomName: string }[]
    expect(rooms).toHaveLength(1)

    const single = await setup.query({ query: singleQuery, variables: { id: rooms[0].id } })
    expect(single.errors).toBeUndefined()
    const [fromStatement] = (single.data?.Room ?? []) as { roomName: string }[]

    // The list projects; the single-room query does not and resolves through cypherFields.
    expect(rooms[0].roomName).toBe(fromStatement.roomName)
    // Guard the fixture: two nulls would satisfy the comparison while proving nothing.
    expect(rooms[0].roomName).toBe('Chat Partner')
  })
})
