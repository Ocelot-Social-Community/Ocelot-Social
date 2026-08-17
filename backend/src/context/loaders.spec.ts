/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Factory, { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'

import { createLoaders } from './loaders'

import type { Driver } from 'neo4j-driver'

// The point of the loader is that N rooms cost ONE query, so the tests assert the query
// COUNT as well as the values. Without the count assertion this would pass just as well
// with the per-room implementation it replaced, and the migration would have bought
// nothing measurable.

let driver: Driver
let reader: string
let sender: string
let blockedSender: string
const rooms: string[] = []

const run = async (cypher: string, params: Record<string, unknown> = {}) => {
  const session = driver.session()
  try {
    return await session.writeTransaction((transaction) => transaction.run(cypher, params))
  } finally {
    await session.close()
  }
}

beforeAll(async () => {
  await cleanDatabase()
  driver = getDriver()

  const [readerNode, senderNode, blockedNode] = await Promise.all([
    Factory.build('user', { name: 'Reader' }),
    Factory.build('user', { name: 'Sender' }),
    Factory.build('user', { name: 'Blocked' }),
  ])
  reader = readerNode.get('id')
  sender = senderNode.get('id')
  blockedSender = blockedNode.get('id')

  // Rooms are built in raw Cypher: the loader reads the graph directly, so driving it
  // through the chat mutations would only add indirection to the fixture.
  //   room-two-unread   2 unread messages from `sender`
  //   room-one-unread   1 unread from `sender`, 1 already seen
  //   room-none         only messages from a blocked sender ⇒ must count 0
  //   room-empty        no messages at all ⇒ must still yield a 0 entry
  rooms.push('room-two-unread', 'room-one-unread', 'room-none', 'room-empty')

  await run(
    `
      MATCH (reader:User { id: $reader })
      MATCH (sender:User { id: $sender })
      MATCH (blocked:User { id: $blocked })
      MERGE (reader)-[:BLOCKED]->(blocked)
      WITH reader, sender, blocked
      UNWIND $rooms AS roomId
      MERGE (room:Room { id: roomId })
      MERGE (reader)-[:CHATS_IN]->(room)
    `,
    { reader, sender, blocked: blockedSender, rooms },
  )

  await run(
    `
      MATCH (reader:User { id: $reader })
      MATCH (sender:User { id: $sender })
      MATCH (blocked:User { id: $blocked })
      MATCH (twoUnread:Room { id: 'room-two-unread' })
      MATCH (oneUnread:Room { id: 'room-one-unread' })
      MATCH (none:Room { id: 'room-none' })

      CREATE (m1:Message { id: 'm1' })-[:INSIDE]->(twoUnread)
      CREATE (m2:Message { id: 'm2' })-[:INSIDE]->(twoUnread)
      CREATE (m3:Message { id: 'm3' })-[:INSIDE]->(oneUnread)
      CREATE (m4:Message { id: 'm4' })-[:INSIDE]->(oneUnread)
      CREATE (m5:Message { id: 'm5' })-[:INSIDE]->(none)

      CREATE (sender)-[:CREATED]->(m1)
      CREATE (sender)-[:CREATED]->(m2)
      CREATE (sender)-[:CREATED]->(m3)
      CREATE (sender)-[:CREATED]->(m4)
      CREATE (blocked)-[:CREATED]->(m5)

      // m4 is deliberately NOT marked unseen — it is the "already read" message.
      CREATE (reader)-[:HAS_NOT_SEEN]->(m1)
      CREATE (reader)-[:HAS_NOT_SEEN]->(m2)
      CREATE (reader)-[:HAS_NOT_SEEN]->(m3)
      CREATE (reader)-[:HAS_NOT_SEEN]->(m5)
    `,
    { reader, sender, blocked: blockedSender },
  )
})

afterAll(async () => {
  await cleanDatabase()
  // closeDriver(), not driver.close(): getDriver() memoises the driver in a module
  // variable, and only closeDriver() clears it. Closing the instance directly would leave
  // a closed driver behind the memo, and it also closes the neode handle that would
  // otherwise keep the worker alive.
  await closeDriver()
})

describe('roomUnreadCount loader', () => {
  it('answers every room, including those with no unread messages', async () => {
    const loaders = createLoaders(driver, reader)

    await expect(loaders.roomUnreadCount.loadMany(rooms)).resolves.toEqual([2, 1, 0, 0])
  })

  it('excludes messages from blocked senders', async () => {
    const loaders = createLoaders(driver, reader)

    await expect(loaders.roomUnreadCount.load('room-none')).resolves.toBe(0)
  })

  it('resolves all rooms of a request in a single query', async () => {
    const loaders = createLoaders(driver, reader)
    const sessionSpy = jest.spyOn(driver, 'session')

    await loaders.roomUnreadCount.loadMany(rooms)

    // The whole point of stage B1: four rooms, one round trip.
    expect(sessionSpy).toHaveBeenCalledTimes(1)
    sessionSpy.mockRestore()
  })

  // Caching is switched off on purpose (see loaders.ts): a subscription context outlives a
  // single resolution pass, so a memoised unreadCount would freeze at its first value while
  // the client keeps receiving roomUpdated events. These two tests pin that behaviour down —
  // if someone enables `cache: true` for the batching win, they fail.
  it('re-reads a repeated key instead of memoising it', async () => {
    const loaders = createLoaders(driver, reader)
    await loaders.roomUnreadCount.load('room-two-unread')

    const sessionSpy = jest.spyOn(driver, 'session')
    await expect(loaders.roomUnreadCount.load('room-two-unread')).resolves.toBe(2)

    expect(sessionSpy).toHaveBeenCalledTimes(1)
    sessionSpy.mockRestore()
  })

  it('sees writes that happen while the same context is still alive', async () => {
    const loaders = createLoaders(driver, reader)
    await expect(loaders.roomUnreadCount.load('room-two-unread')).resolves.toBe(2)

    await run(
      `MATCH (reader:User { id: $reader })-[seen:HAS_NOT_SEEN]->(:Message { id: 'm1' })
       DELETE seen`,
      { reader },
    )

    // Same loader instance, new value — this is the subscription case.
    await expect(loaders.roomUnreadCount.load('room-two-unread')).resolves.toBe(1)

    await run(
      `MATCH (reader:User { id: $reader }), (m:Message { id: 'm1' })
       CREATE (reader)-[:HAS_NOT_SEEN]->(m)`,
      { reader },
    )
  })

  it('gives anonymous viewers zeros without querying', async () => {
    const loaders = createLoaders(driver, null)
    const sessionSpy = jest.spyOn(driver, 'session')

    await expect(loaders.roomUnreadCount.loadMany(rooms)).resolves.toEqual([0, 0, 0, 0])

    expect(sessionSpy).not.toHaveBeenCalled()
    sessionSpy.mockRestore()
  })

  it('does not share a cache between requests', async () => {
    const first = createLoaders(driver, reader)
    await expect(first.roomUnreadCount.load('room-one-unread')).resolves.toBe(1)

    await run(
      `MATCH (reader:User { id: $reader }), (m:Message { id: 'm4' })
       CREATE (reader)-[:HAS_NOT_SEEN]->(m)`,
      { reader },
    )

    // A fresh request must see the new state; a loader cached across requests would not.
    const second = createLoaders(driver, reader)
    await expect(second.roomUnreadCount.load('room-one-unread')).resolves.toBe(2)
  })
})
