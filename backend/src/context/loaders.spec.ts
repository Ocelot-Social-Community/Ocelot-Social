/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Factory, { cleanDatabase } from '@db/factories'
import { closeDriver, getDriver } from '@db/neo4j'
import resolvers from '@graphql/resolvers'

import { createLoaders } from './loaders'

import type { Driver } from 'neo4j-driver'

// Two things are under test here, and they belong to different layers:
//
//   * `forField` as INFRASTRUCTURE — batching, no memoisation, one entry per key. It knows
//     nothing about the domain, so it is tested with a stub batch function.
//   * `Room.unreadCount` as an example CONSUMER — it used to be a hand-written loader in
//     this file; it is now an ordinary `count` entry on Resolver('Room') and goes through
//     the same generic path as every other field. Its semantics (unseen only, blocked and
//     muted senders excluded) are worth pinning down because they are access-control-shaped.

let driver: Driver
let reader: string
let sender: string
let blockedSender: string
const rooms = ['room-two-unread', 'room-one-unread', 'room-none', 'room-empty']

const run = async (cypher: string, params: Record<string, unknown> = {}) => {
  const session = driver.session()
  try {
    return await session.writeTransaction((transaction) => transaction.run(cypher, params))
  } finally {
    await session.close()
  }
}

/** Calls the real Room.unreadCount resolver with a bare parent, as a list query would. */
const unreadCountFor = async (roomIds: string[], viewerId: string | null): Promise<number[]> => {
  const context = {
    driver,
    cypherParams: { currentUserId: viewerId },
    loaders: createLoaders(driver, viewerId),
  }
  const resolver = (resolvers as any).Room.unreadCount
  return Promise.all(
    roomIds.map(async (id) => resolver({ id }, {}, context, {}) as Promise<number>),
  )
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

  //   room-two-unread   2 unread from `sender`
  //   room-one-unread   1 unread from `sender`, 1 already seen
  //   room-none         only messages from a blocked sender ⇒ must count 0
  //   room-empty        no messages at all ⇒ must still yield 0
  await run(
    `
      MATCH (reader:User { id: $reader })
      MATCH (blocked:User { id: $blocked })
      MERGE (reader)-[:BLOCKED]->(blocked)
      WITH reader
      UNWIND $rooms AS roomId
      MERGE (room:Room { id: roomId })
      MERGE (reader)-[:CHATS_IN]->(room)
    `,
    { reader, blocked: blockedSender, rooms },
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

      // m4 is deliberately NOT marked unseen — the "already read" message.
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
  // closeDriver(), not driver.close(): getDriver() memoises the driver in a module variable
  // and only closeDriver() clears it, so a later getDriver() does not hand back a closed one.
  await closeDriver()
})

describe('forField', () => {
  it('coalesces calls made in the same tick into one batch', async () => {
    const loaders = createLoaders(driver, 'irrelevant')
    const batches: (readonly string[])[] = []
    const load = async (id: string) =>
      loaders
        .forField('Probe.field', async (ids) => {
          batches.push(ids)
          return Promise.resolve(ids.map((key) => `value-${key}`))
        })
        .load(id)

    await expect(Promise.all([load('a'), load('b'), load('c')])).resolves.toEqual([
      'value-a',
      'value-b',
      'value-c',
    ])
    // One batch for three keys — the whole point of the registry.
    expect(batches).toHaveLength(1)
    expect(batches[0]).toEqual(['a', 'b', 'c'])
  })

  it('reuses the loader for a key but does not memoise results', async () => {
    const loaders = createLoaders(driver, 'irrelevant')
    let calls = 0
    const load = async (id: string) =>
      loaders
        .forField('Probe.counter', async (ids) => {
          calls += 1
          return Promise.resolve(ids.map(() => calls))
        })
        .load(id)

    await expect(load('a')).resolves.toBe(1)
    // Same key again in a later tick: re-read, not served from a cache. A context can
    // outlive one resolution pass (subscriptions), so a memoised value would go stale.
    await expect(load('a')).resolves.toBe(2)
  })

  it('keeps separate loaders per key', async () => {
    const loaders = createLoaders(driver, 'irrelevant')
    const seen: string[] = []
    const load = async (field: string) =>
      loaders
        .forField(field, async (ids) => {
          seen.push(field)
          return Promise.resolve(ids.map(() => field))
        })
        .load('x')

    await Promise.all([load('A.one'), load('B.two')])
    expect(seen.sort()).toEqual(['A.one', 'B.two'])
  })
})

describe('Room.unreadCount', () => {
  it('counts unseen messages per room, including rooms with none', async () => {
    await expect(unreadCountFor(rooms, reader)).resolves.toEqual([2, 1, 0, 0])
  })

  it('excludes messages from blocked senders', async () => {
    await expect(unreadCountFor(['room-none'], reader)).resolves.toEqual([0])
  })

  it('excludes messages from muted senders', async () => {
    await run(
      `MATCH (reader:User { id: $reader }), (sender:User { id: $sender })
       MERGE (reader)-[:MUTED]->(sender)`,
      { reader, sender },
    )
    await expect(unreadCountFor(['room-two-unread'], reader)).resolves.toEqual([0])

    await run(`MATCH (:User { id: $reader })-[muted:MUTED]->(:User { id: $sender }) DELETE muted`, {
      reader,
      sender,
    })
    await expect(unreadCountFor(['room-two-unread'], reader)).resolves.toEqual([2])
  })

  it('resolves a whole room list in a single query', async () => {
    const sessionSpy = jest.spyOn(driver, 'session')

    await unreadCountFor(rooms, reader)

    // Four rooms, one round trip — the property the DataLoader registry exists for.
    expect(sessionSpy).toHaveBeenCalledTimes(1)
    sessionSpy.mockRestore()
  })

  it('sees writes made while the same context is still alive', async () => {
    const context = {
      driver,
      cypherParams: { currentUserId: reader },
      loaders: createLoaders(driver, reader),
    }
    const resolver = (resolvers as any).Room.unreadCount

    await expect(resolver({ id: 'room-two-unread' }, {}, context, {})).resolves.toBe(2)

    await run(
      `MATCH (:User { id: $reader })-[seen:HAS_NOT_SEEN]->(:Message { id: 'm1' }) DELETE seen`,
      { reader },
    )

    // Same loader instance, new value — this is the subscription case.
    await expect(resolver({ id: 'room-two-unread' }, {}, context, {})).resolves.toBe(1)

    await run(
      `MATCH (reader:User { id: $reader }), (m:Message { id: 'm1' })
       CREATE (reader)-[:HAS_NOT_SEEN]->(m)`,
      { reader },
    )
  })
})
